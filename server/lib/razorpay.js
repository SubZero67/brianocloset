import crypto from "node:crypto"

import { serverEnv } from "./env.js"

function generateMerchantOrderId() {
  return `BOC-${Date.now()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`
}

function normalizeAmount(total) {
  return Math.round(Number(total) * 100)
}

export function buildRazorpayCheckout(order) {
  const merchantOrderId = generateMerchantOrderId()

  if (!serverEnv.razorpayEnabled) {
    return {
      merchantOrderId,
      mode: "mock"
    }
  }

  if (!serverEnv.razorpayKeyId || !serverEnv.razorpayKeySecret) {
    throw new Error("Razorpay credentials are missing on the server.")
  }

  return {
    merchantOrderId,
    amount: normalizeAmount(order.total),
    currency: "INR",
    receipt: merchantOrderId,
    notes: {
      merchantOrderId,
      customerEmail: order.customer.email || "",
      customerPhone: order.customer.phone || ""
    },
    mode: "live"
  }
}

export function buildRazorpayBasicAuthHeader() {
  const credentials = Buffer.from(
    `${serverEnv.razorpayKeyId}:${serverEnv.razorpayKeySecret}`
  ).toString("base64")

  return `Basic ${credentials}`
}

export function verifyRazorpaySignature({
  razorpayOrderId,
  razorpayPaymentId,
  razorpaySignature
}) {
  if (!serverEnv.razorpayKeySecret) {
    return false
  }

  const expected = crypto
    .createHmac("sha256", serverEnv.razorpayKeySecret)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest("hex")

  const provided = Buffer.from(String(razorpaySignature || ""))
  const target = Buffer.from(expected)

  if (provided.length !== target.length) {
    return false
  }

  return crypto.timingSafeEqual(target, provided)
}

export function verifyRazorpayWebhookSignature(rawBody, signature) {
  if (!serverEnv.razorpayWebhookSecret) {
    return false
  }

  const expected = crypto
    .createHmac("sha256", serverEnv.razorpayWebhookSecret)
    .update(rawBody)
    .digest("hex")

  const provided = Buffer.from(String(signature || ""))
  const target = Buffer.from(expected)

  if (provided.length !== target.length) {
    return false
  }

  return crypto.timingSafeEqual(target, provided)
}
