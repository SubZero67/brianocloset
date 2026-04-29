import http from "node:http"
import crypto from "node:crypto"
import { createReadStream, existsSync, statSync } from "node:fs"
import path from "node:path"
import { URL } from "node:url"

import { writeAuditLog } from "./lib/audit.js"
import { nextNumericId, readCollection, writeCollection } from "./lib/db.js"
import { serverEnv } from "./lib/env.js"
import { notFound, readJsonBody, readRawBody, sendJson } from "./lib/http.js"
import {
  buildRazorpayBasicAuthHeader,
  buildRazorpayCheckout,
  verifyRazorpaySignature,
  verifyRazorpayWebhookSignature
} from "./lib/razorpay.js"
import {
  applyRateLimit,
  assertProductionSafety,
  buildExpiredSessionCookie,
  buildSessionCookie,
  createSession,
  destroySession,
  ensureAllowedOrigin,
  getSession,
  verifyPassword
} from "./lib/security.js"

const allowedOrderStatuses = new Set([
  "pending_payment",
  "paid",
  "packed",
  "shipped",
  "delivered",
  "cancelled"
])

const distDir = path.resolve("dist")
const publicDir = path.resolve("public")

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".mp4": "video/mp4",
  ".woff": "font/woff",
  ".woff2": "font/woff2"
}

assertProductionSafety()

function clientIp(request) {
  return request?.socket?.remoteAddress || "unknown"
}

function requireAllowedFrontendOrigin(request, response) {
  if (!ensureAllowedOrigin(request, false)) {
    sendJson(request, response, 403, {
      message: "Blocked by origin policy."
    })
    return false
  }

  return true
}

function requireAdmin(request, response) {
  const session = getSession(request)

  if (!session) {
    sendJson(request, response, 401, {
      message: "Admin authorization required."
    })
    return null
  }

  const rateLimit = applyRateLimit(
    request,
    "admin-api",
    serverEnv.adminMaxRequests,
    serverEnv.adminWindowMs
  )

  if (!rateLimit.allowed) {
    sendJson(
      request,
      response,
      429,
      {
        message: "Too many admin requests. Try again later."
      },
      {
        "Retry-After": String(rateLimit.retryAfterSeconds)
      }
    )
    return null
  }

  return session
}

function normalizeOrderItem(rawItem) {
  return {
    productId: Number(rawItem.productId),
    name: String(rawItem.name || "").trim(),
    size: String(rawItem.size || "").trim(),
    price: Number(rawItem.price),
    quantity: Number(rawItem.quantity) || 1,
    image: String(rawItem.image || "").trim()
  }
}

function normalizeProductImages(body) {
  const candidates = Array.isArray(body.images)
    ? body.images
    : typeof body.imagesText === "string"
      ? body.imagesText.split(/\r?\n/)
      : body.image
        ? [body.image]
        : []

  return candidates
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .slice(0, 8)
}

function sanitizeText(value, maxLength = 500) {
  return String(value || "").trim().slice(0, maxLength)
}

function validateProductPayload(body) {
  if (!body.name?.trim()) {
    return "Product name is required."
  }

  if (sanitizeText(body.name, 120).length < 3) {
    return "Product name must be at least 3 characters."
  }

  if (!body.brand?.trim()) {
    return "Brand is required."
  }

  if (!body.category?.trim()) {
    return "Category is required."
  }

  if (!Number.isFinite(Number(body.price)) || Number(body.price) < 0) {
    return "Price must be a valid non-negative number."
  }

  if (!Number.isFinite(Number(body.stock)) || Number(body.stock) < 0) {
    return "Stock must be a valid non-negative number."
  }

  if (!body.image?.trim()) {
    return "Primary image URL is required."
  }

  if (normalizeProductImages(body).length === 0) {
    return "At least one product image is required."
  }

  return ""
}

function validateCheckoutPayload(orderInput) {
  if (!orderInput?.customer || !Array.isArray(orderInput.items) || orderInput.items.length === 0) {
    return "Customer and item details are required."
  }

  const customer = orderInput.customer
  const requiredCustomerFields = [
    "fullName",
    "email",
    "phone",
    "addressLine1",
    "city",
    "state",
    "postalCode"
  ]

  for (const field of requiredCustomerFields) {
    if (!String(customer[field] || "").trim()) {
      return "All required customer and shipping fields must be filled."
    }
  }

  if (sanitizeText(customer.fullName, 120).length < 2) {
    return "Customer name looks invalid."
  }

  if (!String(customer.email).includes("@")) {
    return "Customer email looks invalid."
  }

  for (const item of orderInput.items) {
    if (!Number.isFinite(Number(item.productId))) {
      return "Each order item must have a valid product id."
    }

    if (!String(item.name || "").trim()) {
      return "Each order item must include a product name."
    }

    if (!Number.isFinite(Number(item.price)) || Number(item.price) < 0) {
      return "Each order item must include a valid price."
    }

    if (!Number.isFinite(Number(item.quantity)) || Number(item.quantity) <= 0) {
      return "Each order item must include a valid quantity."
    }
  }

  return ""
}

async function createOrderRecord(orderInput, merchantOrderId, paymentMode, request, paymentMeta = {}) {
  const orders = await readCollection("orders")
  const products = await readCollection("products")
  const orderId = await nextNumericId("orders")
  const items = orderInput.items.map(normalizeOrderItem)

  for (const item of items) {
    const product = products.find((entry) => entry.id === item.productId)

    if (!product || !product.isActive) {
      throw new Error(`Product ${item.productId} is unavailable.`)
    }

    if (product.stock < item.quantity) {
      throw new Error(`${product.name} is out of stock for the requested quantity.`)
    }
  }

  const record = {
    id: orderId,
    merchantOrderId,
    paymentProvider: "razorpay",
    paymentMode,
    paymentStatus: "pending",
    orderStatus: "pending_payment",
    customerName: sanitizeText(orderInput.customer.fullName, 120),
    customerEmail: sanitizeText(orderInput.customer.email, 200),
    customerPhone: sanitizeText(orderInput.customer.phone, 30),
    shippingAddressLine1: sanitizeText(orderInput.customer.addressLine1, 200),
    shippingAddressLine2: sanitizeText(orderInput.customer.addressLine2 || "", 200),
    shippingCity: sanitizeText(orderInput.customer.city, 120),
    shippingState: sanitizeText(orderInput.customer.state, 120),
    shippingPostalCode: sanitizeText(orderInput.customer.postalCode, 20),
    subtotal: Number(orderInput.subtotal),
    shippingFee: Number(orderInput.shippingFee),
    total: Number(orderInput.total),
    items,
    paymentMeta,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }

  orders.push(record)
  await writeCollection("orders", orders)

  await writeAuditLog({
    type: "order_created",
    ip: clientIp(request),
    merchantOrderId,
    orderId
  }).catch(() => {})

  return record
}

async function markOrderPaid(merchantOrderId, paymentMeta = {}) {
  const orders = await readCollection("orders")
  const products = await readCollection("products")
  const order = orders.find((entry) => entry.merchantOrderId === merchantOrderId)

  if (!order) {
    throw new Error("Order not found.")
  }

  if (order.paymentStatus === "paid") {
    return order
  }

  for (const item of order.items) {
    const product = products.find((entry) => entry.id === item.productId)
    if (product) {
      product.stock = Math.max(0, product.stock - item.quantity)
    }
  }

  order.paymentStatus = "paid"
  order.orderStatus = "paid"
  order.paymentMeta = {
    ...(order.paymentMeta || {}),
    ...paymentMeta
  }
  order.updatedAt = new Date().toISOString()

  await writeCollection("products", products)
  await writeCollection("orders", orders)

  await writeAuditLog({
    type: "order_paid",
    merchantOrderId,
    orderId: order.id
  }).catch(() => {})

  return order
}

function findOrderByRazorpayOrderId(orders, razorpayOrderId) {
  return orders.find((entry) => entry.paymentMeta?.razorpayOrderId === razorpayOrderId)
}

async function fetchRazorpayPaymentsForOrder(razorpayOrderId) {
  const response = await fetch(
    `${serverEnv.razorpayBaseUrl}/v1/orders/${razorpayOrderId}/payments`,
    {
      method: "GET",
      headers: {
        Authorization: buildRazorpayBasicAuthHeader()
      }
    }
  )

  const data = await response.json()

  if (!response.ok) {
    throw new Error(
      data?.error?.description || data?.message || "Unable to fetch Razorpay payments."
    )
  }

  return Array.isArray(data?.items) ? data.items : []
}

function pickSuccessfulRazorpayPayment(payments) {
  return payments.find((payment) =>
    ["captured", "authorized"].includes(String(payment.status || "").toLowerCase())
  )
}

async function handleRazorpayCheckout(request, response) {
  const rateLimit = applyRateLimit(
    request,
    "checkout",
    serverEnv.checkoutMaxRequests,
    serverEnv.checkoutWindowMs
  )

  if (!rateLimit.allowed) {
    sendJson(
      request,
      response,
      429,
      {
        message: "Too many checkout attempts. Try again later."
      },
      {
        "Retry-After": String(rateLimit.retryAfterSeconds)
      }
    )
    return
  }

  const orderInput = await readJsonBody(request)
  const validationMessage = validateCheckoutPayload(orderInput)

  if (validationMessage) {
    sendJson(request, response, 400, {
      message: validationMessage
    })
    return
  }

  try {
    const payment = buildRazorpayCheckout(orderInput)

    if (payment.mode === "mock") {
      sendJson(request, response, 503, {
        message: "Payment gateway is not connected yet.",
        setupRequired: true,
        mode: "setup"
      })
      return
    }

    const gatewayResponse = await fetch(`${serverEnv.razorpayBaseUrl}/v1/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: buildRazorpayBasicAuthHeader()
      },
      body: JSON.stringify({
        amount: payment.amount,
        currency: payment.currency,
        receipt: payment.receipt,
        notes: payment.notes
      })
    })

    const data = await gatewayResponse.json()

    if (!gatewayResponse.ok || !data?.id) {
      sendJson(request, response, 502, {
        message: data?.error?.description || data?.message || "Razorpay order creation failed.",
        data
      })
      return
    }

    await createOrderRecord(orderInput, payment.merchantOrderId, payment.mode, request, {
      provider: "razorpay",
      razorpayOrderId: data.id,
      receipt: data.receipt
    })

    sendJson(request, response, 200, {
      merchantOrderId: payment.merchantOrderId,
      mode: "live",
      keyId: serverEnv.razorpayKeyId,
      orderId: data.id,
      amount: data.amount,
      currency: data.currency,
      customer: {
        name: sanitizeText(orderInput.customer.fullName, 120),
        email: sanitizeText(orderInput.customer.email, 200),
        contact: sanitizeText(orderInput.customer.phone, 30)
      }
    })
  } catch (error) {
    sendJson(request, response, 400, {
      message: error.message || "Unable to create checkout."
    })
  }
}

async function handleRazorpayVerify(request, response) {
  if (!requireAllowedFrontendOrigin(request, response)) {
    return
  }

  const payload = await readJsonBody(request)
  const razorpayOrderId = String(payload?.razorpay_order_id || "").trim()
  const razorpayPaymentId = String(payload?.razorpay_payment_id || "").trim()
  const razorpaySignature = String(payload?.razorpay_signature || "").trim()

  if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
    sendJson(request, response, 400, {
      message: "Razorpay payment verification details are required."
    })
    return
  }

  try {
    if (!verifyRazorpaySignature({ razorpayOrderId, razorpayPaymentId, razorpaySignature })) {
      sendJson(request, response, 400, {
        message: "Invalid Razorpay signature."
      })
      return
    }

    const orders = await readCollection("orders")
    const existingOrder = findOrderByRazorpayOrderId(orders, razorpayOrderId)

    if (!existingOrder) {
      sendJson(request, response, 404, {
        message: "Order not found for this Razorpay payment."
      })
      return
    }

    const order = await markOrderPaid(existingOrder.merchantOrderId, {
      ...(existingOrder.paymentMeta || {}),
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      verifiedAt: new Date().toISOString()
    })

    sendJson(request, response, 200, {
      message: "Razorpay payment verified.",
      order
    })
  } catch (error) {
    sendJson(request, response, 404, {
      message: error.message
    })
  }
}

async function handleRazorpayReconcile(request, response, merchantOrderId) {
  const orders = await readCollection("orders")
  const order = orders.find((entry) => entry.merchantOrderId === merchantOrderId)

  if (!order) {
    sendJson(request, response, 404, {
      message: "Order not found."
    })
    return
  }

  if (order.paymentStatus === "paid") {
    sendJson(request, response, 200, {
      message: "Order already verified.",
      order
    })
    return
  }

  const razorpayOrderId = order.paymentMeta?.razorpayOrderId

  if (!razorpayOrderId) {
    sendJson(request, response, 400, {
      message: "This order does not have a Razorpay order reference yet."
    })
    return
  }

  const payments = await fetchRazorpayPaymentsForOrder(razorpayOrderId)
  const successfulPayment = pickSuccessfulRazorpayPayment(payments)

  if (!successfulPayment) {
    sendJson(request, response, 202, {
      message: "Payment is still pending confirmation.",
      order
    })
    return
  }

  const updatedOrder = await markOrderPaid(merchantOrderId, {
    ...(order.paymentMeta || {}),
    razorpayOrderId,
    razorpayPaymentId: successfulPayment.id,
    reconciledAt: new Date().toISOString(),
    reconcileSource: "server-status-check"
  })

  sendJson(request, response, 200, {
    message: "Order payment reconciled.",
    order: updatedOrder
  })
}

async function handleRazorpayWebhook(request, response) {
  const rawBody = await readRawBody(request)
  const signature = request.headers["x-razorpay-signature"]

  if (!verifyRazorpayWebhookSignature(rawBody, signature)) {
    sendJson(request, response, 400, {
      message: "Invalid Razorpay webhook signature."
    })
    return
  }

  const payload = rawBody ? JSON.parse(rawBody) : {}
  const payment = payload?.payload?.payment?.entity
  const razorpayOrderId = payment?.order_id
  const razorpayPaymentId = payment?.id
  const paymentStatus = String(payment?.status || "").toLowerCase()

  if (!razorpayOrderId || !razorpayPaymentId || !["captured", "authorized"].includes(paymentStatus)) {
    sendJson(request, response, 200, {
      received: true
    })
    return
  }

  const orders = await readCollection("orders")
  const order = findOrderByRazorpayOrderId(orders, razorpayOrderId)

  if (!order) {
    sendJson(request, response, 404, {
      message: "Order not found for this Razorpay webhook."
    })
    return
  }

  await markOrderPaid(order.merchantOrderId, {
    ...(order.paymentMeta || {}),
    razorpayOrderId,
    razorpayPaymentId,
    webhookEvent: payload?.event || "payment.unknown",
    webhookReceivedAt: new Date().toISOString()
  })

  sendJson(request, response, 200, {
    received: true
  })
}

async function handleMockPaymentSuccess(request, response, merchantOrderId) {
  sendJson(request, response, 410, {
    message: "Mock payment success is disabled."
  })
}

async function handleAdminLogin(request, response) {
  if (!requireAllowedFrontendOrigin(request, response)) {
    return
  }

  const rateLimit = applyRateLimit(
    request,
    "admin-login",
    serverEnv.loginMaxAttempts,
    serverEnv.loginWindowMs
  )

  if (!rateLimit.allowed) {
    sendJson(
      request,
      response,
      429,
      {
        message: "Too many login attempts. Try again later."
      },
      {
        "Retry-After": String(rateLimit.retryAfterSeconds)
      }
    )
    return
  }

  const body = await readJsonBody(request)

  if (!body.username?.trim() || !body.password?.trim()) {
    sendJson(request, response, 400, {
      message: "Username and password are required."
    })
    return
  }

  const usernameMatches = body.username === serverEnv.adminUsername
  const passwordMatches = verifyPassword(
    body.password,
    serverEnv.adminPassword,
    serverEnv.adminPasswordHash
  )

  if (!usernameMatches || !passwordMatches) {
    await writeAuditLog({
      type: "admin_login_failed",
      ip: clientIp(request)
    }).catch(() => {})

    sendJson(request, response, 401, {
      message: "Invalid admin credentials."
    })
    return
  }

  const expiresAt = Date.now() + serverEnv.sessionTtlMs
  const sessionToken = createSession(serverEnv.adminUsername)

  await writeAuditLog({
    type: "admin_login_success",
    ip: clientIp(request),
    username: serverEnv.adminUsername
  }).catch(() => {})

  sendJson(
    request,
    response,
    200,
    {
      username: serverEnv.adminUsername,
      authenticated: true
    },
    {
      "Set-Cookie": buildSessionCookie(sessionToken, expiresAt)
    }
  )
}

async function handleAdminLogout(request, response) {
  if (!requireAllowedFrontendOrigin(request, response)) {
    return
  }

  destroySession(request)

  await writeAuditLog({
    type: "admin_logout",
    ip: clientIp(request)
  }).catch(() => {})

  sendJson(
    request,
    response,
    200,
    {
      message: "Logged out."
    },
    {
      "Set-Cookie": buildExpiredSessionCookie()
    }
  )
}

function handleAdminSession(request, response) {
  const session = getSession(request)

  if (!session) {
    sendJson(request, response, 401, {
      message: "No active admin session."
    })
    return
  }

  sendJson(request, response, 200, {
    authenticated: true,
    username: session.username
  })
}

async function handleProductsGet(request, response) {
  const products = await readCollection("products")
  sendJson(request, response, 200, { products })
}

async function handlePublicProductsGet(request, response) {
  const products = await readCollection("products")
  sendJson(request, response, 200, {
    products: products.filter((product) => product.isActive !== false)
  })
}

async function handleProductsCreate(request, response) {
  const body = await readJsonBody(request)
  const validationMessage = validateProductPayload(body)

  if (validationMessage) {
    sendJson(request, response, 400, {
      message: validationMessage
    })
    return
  }

  const products = await readCollection("products")
  const id = await nextNumericId("products")

  const product = {
    id,
    name: sanitizeText(body.name, 120),
    price: Number(body.price),
    brand: sanitizeText(body.brand, 80),
    category: sanitizeText(body.category, 80),
    image: sanitizeText(body.image, 2000),
    images: normalizeProductImages(body),
    description: sanitizeText(body.description, 1000),
    stock: Number(body.stock) || 0,
    isActive: body.isActive !== false
  }

  products.push(product)
  await writeCollection("products", products)

  await writeAuditLog({
    type: "product_created",
    ip: clientIp(request),
    productId: id
  }).catch(() => {})

  sendJson(request, response, 201, { product })
}

async function handleProductsPatch(request, response, productId) {
  const body = await readJsonBody(request)
  const products = await readCollection("products")
  const product = products.find((entry) => entry.id === Number(productId))

  if (!product) {
    sendJson(request, response, 404, {
      message: "Product not found."
    })
    return
  }

  const validationMessage = validateProductPayload({
    ...product,
    ...body
  })

  if (validationMessage) {
    sendJson(request, response, 400, {
      message: validationMessage
    })
    return
  }

  Object.assign(product, {
    ...(body.name !== undefined ? { name: sanitizeText(body.name, 120) } : {}),
    ...(body.price !== undefined ? { price: Number(body.price) } : {}),
    ...(body.brand !== undefined ? { brand: sanitizeText(body.brand, 80) } : {}),
    ...(body.category !== undefined ? { category: sanitizeText(body.category, 80) } : {}),
    ...(body.image !== undefined ? { image: sanitizeText(body.image, 2000) } : {}),
    ...(body.images !== undefined || body.imagesText !== undefined
      ? { images: normalizeProductImages(body) }
      : {}),
    ...(body.description !== undefined
      ? { description: sanitizeText(body.description, 1000) }
      : {}),
    ...(body.stock !== undefined ? { stock: Number(body.stock) } : {}),
    ...(body.isActive !== undefined ? { isActive: Boolean(body.isActive) } : {})
  })

  await writeCollection("products", products)

  await writeAuditLog({
    type: "product_updated",
    ip: clientIp(request),
    productId: product.id
  }).catch(() => {})

  sendJson(request, response, 200, { product })
}

async function handleProductsDelete(request, response, productId) {
  const products = await readCollection("products")
  const orders = await readCollection("orders")
  const numericProductId = Number(productId)
  const product = products.find((entry) => entry.id === numericProductId)

  if (!product) {
    sendJson(request, response, 404, {
      message: "Product not found."
    })
    return
  }

  const isReferencedInOrders = orders.some((order) =>
    order.items.some((item) => item.productId === numericProductId)
  )

  if (isReferencedInOrders) {
    sendJson(request, response, 409, {
      message: "This product is already part of an order and cannot be deleted."
    })
    return
  }

  const nextProducts = products.filter((entry) => entry.id !== numericProductId)
  await writeCollection("products", nextProducts)

  await writeAuditLog({
    type: "product_deleted",
    ip: clientIp(request),
    productId: numericProductId
  }).catch(() => {})

  sendJson(request, response, 200, {
    message: "Product deleted."
  })
}

async function handleOrdersGet(request, response) {
  const orders = await readCollection("orders")
  sendJson(request, response, 200, { orders })
}

async function handleOrderPatch(request, response, orderId) {
  const body = await readJsonBody(request)
  const orders = await readCollection("orders")
  const order = orders.find((entry) => entry.id === Number(orderId))

  if (!order) {
    sendJson(request, response, 404, {
      message: "Order not found."
    })
    return
  }

  if (body.orderStatus !== undefined && !allowedOrderStatuses.has(body.orderStatus)) {
    sendJson(request, response, 400, {
      message: "Invalid order status."
    })
    return
  }

  if (
    body.paymentStatus !== undefined &&
    !["pending", "paid", "failed", "refunded"].includes(body.paymentStatus)
  ) {
    sendJson(request, response, 400, {
      message: "Invalid payment status."
    })
    return
  }

  Object.assign(order, {
    ...(body.orderStatus !== undefined ? { orderStatus: body.orderStatus } : {}),
    ...(body.paymentStatus !== undefined ? { paymentStatus: body.paymentStatus } : {}),
    updatedAt: new Date().toISOString()
  })

  await writeCollection("orders", orders)

  await writeAuditLog({
    type: "order_updated",
    ip: clientIp(request),
    orderId: order.id
  }).catch(() => {})

  sendJson(request, response, 200, { order })
}

async function handleOrderDelete(request, response, orderId) {
  const orders = await readCollection("orders")
  const numericOrderId = Number(orderId)
  const order = orders.find((entry) => entry.id === numericOrderId)

  if (!order) {
    sendJson(request, response, 404, {
      message: "Order not found."
    })
    return
  }

  const products = await readCollection("products")

  if (order.paymentStatus === "paid") {
    for (const item of order.items) {
      const product = products.find((entry) => entry.id === item.productId)

      if (product) {
        product.stock += Number(item.quantity) || 0
      }
    }
  }

  const nextOrders = orders.filter((entry) => entry.id !== numericOrderId)
  await writeCollection("products", products)
  await writeCollection("orders", nextOrders)

  await writeAuditLog({
    type: "order_deleted",
    ip: clientIp(request),
    orderId: numericOrderId
  }).catch(() => {})

  sendJson(request, response, 200, {
    message: "Order deleted."
  })
}

async function handleOrderGet(request, response, merchantOrderId) {
  const orders = await readCollection("orders")
  const order = orders.find((entry) => entry.merchantOrderId === merchantOrderId)

  if (!order) {
    sendJson(request, response, 404, {
      message: "Order not found."
    })
    return
  }

  sendJson(request, response, 200, { order })
}

function buildStaticCacheControl(filePath) {
  return filePath.includes(`${path.sep}assets${path.sep}`) || filePath.includes(`${path.sep}catalog${path.sep}`)
    ? "public, max-age=31536000, immutable"
    : "public, max-age=300"
}

function sendFile(request, response, filePath) {
  const ext = path.extname(filePath).toLowerCase()
  const contentType = contentTypes[ext] || "application/octet-stream"
  const cacheControl = buildStaticCacheControl(filePath)
  const fileSize = statSync(filePath).size
  const rangeHeader = request.headers.range

  if (rangeHeader) {
    const match = rangeHeader.match(/bytes=(\d*)-(\d*)/)

    if (!match) {
      response.writeHead(416, {
        "Content-Range": `bytes */${fileSize}`
      })
      response.end()
      return
    }

    const start = match[1] ? Number(match[1]) : 0
    const end = match[2] ? Number(match[2]) : fileSize - 1

    if (
      !Number.isFinite(start) ||
      !Number.isFinite(end) ||
      start < 0 ||
      end >= fileSize ||
      start > end
    ) {
      response.writeHead(416, {
        "Content-Range": `bytes */${fileSize}`
      })
      response.end()
      return
    }

    response.writeHead(206, {
      "Content-Type": contentType,
      "Content-Length": String(end - start + 1),
      "Content-Range": `bytes ${start}-${end}/${fileSize}`,
      "Accept-Ranges": "bytes",
      "Cache-Control": cacheControl,
      "X-Content-Type-Options": "nosniff"
    })

    if (request.method === "HEAD") {
      response.end()
      return
    }

    createReadStream(filePath, { start, end }).pipe(response)
    return
  }

  response.writeHead(200, {
    "Content-Type": contentType,
    "Content-Length": String(fileSize),
    "Accept-Ranges": "bytes",
    "Cache-Control": cacheControl,
    "X-Content-Type-Options": "nosniff"
  })

  if (request.method === "HEAD") {
    response.end()
    return
  }

  createReadStream(filePath).pipe(response)
}

function tryServeStatic(request, pathname, response) {
  const normalizedPath = pathname === "/" ? "/index.html" : pathname
  const trimmedPath = normalizedPath.replace(/^\/+/, "")
  const publicFilePath = path.join(publicDir, trimmedPath)
  const distFilePath = path.join(distDir, trimmedPath)

  if (existsSync(publicFilePath)) {
    sendFile(request, response, publicFilePath)
    return true
  }

  if (existsSync(distFilePath)) {
    sendFile(request, response, distFilePath)
    return true
  }

  return false
}

function tryServeFrontend(request, pathname, response) {
  if (!existsSync(distDir)) {
    return false
  }

  if (tryServeStatic(request, pathname, response)) {
    return true
  }

  const indexPath = path.join(distDir, "index.html")

  if (!existsSync(indexPath)) {
    return false
  }

  sendFile(request, response, indexPath)
  return true
}

const server = http.createServer(async (request, response) => {
  if (!request.url) {
    notFound(request, response)
    return
  }

  if (request.method === "OPTIONS") {
    sendJson(request, response, 200, {})
    return
  }

  const url = new URL(request.url, `http://${request.headers.host}`)
  const pathname = url.pathname

  try {
    if (request.method === "GET" && pathname === "/api/health") {
      sendJson(request, response, 200, {
        status: "ok",
        now: new Date().toISOString()
      })
      return
    }

    if (request.method === "POST" && pathname === "/api/payments/razorpay/checkout") {
      await handleRazorpayCheckout(request, response)
      return
    }

    if (request.method === "POST" && pathname === "/api/payments/razorpay/verify") {
      await handleRazorpayVerify(request, response)
      return
    }

    if (request.method === "POST" && pathname === "/api/payments/razorpay/webhook") {
      await handleRazorpayWebhook(request, response)
      return
    }

    if (request.method === "POST" && pathname.startsWith("/api/payments/razorpay/reconcile/")) {
      const merchantOrderId = pathname.split("/").pop()
      await handleRazorpayReconcile(request, response, merchantOrderId)
      return
    }

    if (request.method === "GET" && pathname === "/api/payments/razorpay/mock-success") {
      await handleMockPaymentSuccess(request, response, url.searchParams.get("merchantOrderId"))
      return
    }

    if (request.method === "POST" && pathname === "/api/admin/login") {
      await handleAdminLogin(request, response)
      return
    }

    if (request.method === "POST" && pathname === "/api/admin/logout") {
      await handleAdminLogout(request, response)
      return
    }

    if (request.method === "GET" && pathname === "/api/admin/session") {
      handleAdminSession(request, response)
      return
    }

    if (request.method === "GET" && pathname === "/api/products") {
      await handlePublicProductsGet(request, response)
      return
    }

    if (pathname.startsWith("/api/admin/")) {
      const session = requireAdmin(request, response)
      if (!session) {
        return
      }

      if (["POST", "PATCH", "DELETE"].includes(request.method) && !requireAllowedFrontendOrigin(request, response)) {
        return
      }
    }

    if (request.method === "GET" && pathname === "/api/admin/products") {
      await handleProductsGet(request, response)
      return
    }

    if (request.method === "POST" && pathname === "/api/admin/products") {
      await handleProductsCreate(request, response)
      return
    }

    if (request.method === "PATCH" && pathname.startsWith("/api/admin/products/")) {
      const productId = pathname.split("/").pop()
      await handleProductsPatch(request, response, productId)
      return
    }

    if (
      (request.method === "DELETE" && pathname.startsWith("/api/admin/products/")) ||
      (request.method === "POST" && pathname.startsWith("/api/admin/products/delete/"))
    ) {
      const productId = pathname.split("/").pop()
      await handleProductsDelete(request, response, productId)
      return
    }

    if (request.method === "GET" && pathname === "/api/admin/orders") {
      await handleOrdersGet(request, response)
      return
    }

    if (request.method === "PATCH" && pathname.startsWith("/api/admin/orders/")) {
      const orderId = pathname.split("/").pop()
      await handleOrderPatch(request, response, orderId)
      return
    }

    if (request.method === "POST" && pathname.startsWith("/api/admin/orders/delete/")) {
      const orderId = pathname.split("/").pop()
      await handleOrderDelete(request, response, orderId)
      return
    }

    if (request.method === "GET" && pathname.startsWith("/api/orders/")) {
      const merchantOrderId = pathname.split("/").pop()
      await handleOrderGet(request, response, merchantOrderId)
      return
    }

    if (request.method === "GET" || request.method === "HEAD") {
      if (tryServeFrontend(request, pathname, response)) {
        return
      }
    }

    notFound(request, response)
  } catch (error) {
    const statusCode =
      error.message === "Request body too large."
        ? 413
        : error.message === "Invalid JSON payload."
          ? 400
          : 500

    sendJson(request, response, statusCode, {
      message: statusCode === 500 ? "Unexpected server error." : error.message,
      traceId: statusCode === 500 ? crypto.randomUUID() : undefined
    })
  }
})

server.headersTimeout = 10_000
server.requestTimeout = 15_000

server.listen(serverEnv.port, () => {
  console.log(`Backend listening on http://localhost:${serverEnv.port}`)
})
