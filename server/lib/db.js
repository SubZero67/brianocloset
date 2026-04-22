import { existsSync, mkdirSync, readFileSync } from "node:fs"
import path from "node:path"
import { DatabaseSync } from "node:sqlite"

import { serverEnv } from "./env.js"

const dataDir = path.resolve("server/data")
const databasePath = path.resolve(serverEnv.databasePath)

mkdirSync(path.dirname(databasePath), {
  recursive: true
})

const database = new DatabaseSync(databasePath)

database.exec(`
  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    price REAL NOT NULL,
    brand TEXT NOT NULL,
    category TEXT NOT NULL,
    image TEXT NOT NULL,
    images_json TEXT NOT NULL,
    description TEXT NOT NULL,
    stock INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY,
    merchant_order_id TEXT NOT NULL UNIQUE,
    payment_provider TEXT NOT NULL,
    payment_mode TEXT NOT NULL,
    payment_status TEXT NOT NULL,
    order_status TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    customer_email TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    shipping_address_line1 TEXT NOT NULL,
    shipping_address_line2 TEXT NOT NULL,
    shipping_city TEXT NOT NULL,
    shipping_state TEXT NOT NULL,
    shipping_postal_code TEXT NOT NULL,
    subtotal REAL NOT NULL,
    shipping_fee REAL NOT NULL,
    total REAL NOT NULL,
    items_json TEXT NOT NULL,
    payment_meta_json TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
`)

function jsonFilePath(name) {
  return path.join(dataDir, `${name}.json`)
}

function safeReadJsonArray(filePath) {
  if (!existsSync(filePath)) {
    return []
  }

  try {
    const raw = readFileSync(filePath, "utf8")
    const value = JSON.parse(raw)
    return Array.isArray(value) ? value : []
  } catch {
    return []
  }
}

function rowCount(tableName) {
  const statement = database.prepare(`SELECT COUNT(*) AS count FROM ${tableName}`)
  return Number(statement.get().count || 0)
}

function runInTransaction(work) {
  database.exec("BEGIN")

  try {
    const result = work()
    database.exec("COMMIT")
    return result
  } catch (error) {
    database.exec("ROLLBACK")
    throw error
  }
}

function insertProduct(product) {
  const statement = database.prepare(`
    INSERT INTO products (
      id,
      name,
      price,
      brand,
      category,
      image,
      images_json,
      description,
      stock,
      is_active
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  statement.run(
    Number(product.id),
    String(product.name || ""),
    Number(product.price || 0),
    String(product.brand || ""),
    String(product.category || ""),
    String(product.image || ""),
    JSON.stringify(
      Array.isArray(product.images)
        ? product.images
        : product.image
          ? [product.image]
          : []
    ),
    String(product.description || ""),
    Number(product.stock || 0),
    product.isActive === false ? 0 : 1
  )
}

function insertOrder(order) {
  const statement = database.prepare(`
    INSERT INTO orders (
      id,
      merchant_order_id,
      payment_provider,
      payment_mode,
      payment_status,
      order_status,
      customer_name,
      customer_email,
      customer_phone,
      shipping_address_line1,
      shipping_address_line2,
      shipping_city,
      shipping_state,
      shipping_postal_code,
      subtotal,
      shipping_fee,
      total,
      items_json,
      payment_meta_json,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  statement.run(
    Number(order.id),
    String(order.merchantOrderId || ""),
    String(order.paymentProvider || "razorpay"),
    String(order.paymentMode || "mock"),
    String(order.paymentStatus || "pending"),
    String(order.orderStatus || "pending_payment"),
    String(order.customerName || ""),
    String(order.customerEmail || ""),
    String(order.customerPhone || ""),
    String(order.shippingAddressLine1 || ""),
    String(order.shippingAddressLine2 || ""),
    String(order.shippingCity || ""),
    String(order.shippingState || ""),
    String(order.shippingPostalCode || ""),
    Number(order.subtotal || 0),
    Number(order.shippingFee || 0),
    Number(order.total || 0),
    JSON.stringify(Array.isArray(order.items) ? order.items : []),
    order.paymentMeta ? JSON.stringify(order.paymentMeta) : null,
    String(order.createdAt || new Date().toISOString()),
    String(order.updatedAt || new Date().toISOString())
  )
}

function migrateProductsFromJson() {
  if (rowCount("products") > 0) {
    return
  }

  const products = safeReadJsonArray(jsonFilePath("products"))

  if (products.length === 0) {
    return
  }

  runInTransaction(() => {
    for (const product of products) {
      insertProduct(product)
    }
  })
}

function migrateOrdersFromJson() {
  if (rowCount("orders") > 0) {
    return
  }

  const orders = safeReadJsonArray(jsonFilePath("orders"))

  if (orders.length === 0) {
    return
  }

  runInTransaction(() => {
    for (const order of orders) {
      insertOrder(order)
    }
  })
}

function parseJson(value, fallback) {
  if (!value) {
    return fallback
  }

  try {
    return JSON.parse(value)
  } catch {
    return fallback
  }
}

function productFromRow(row) {
  return {
    id: Number(row.id),
    name: row.name,
    price: Number(row.price),
    brand: row.brand,
    category: row.category,
    image: row.image,
    images: parseJson(row.images_json, row.image ? [row.image] : []),
    description: row.description,
    stock: Number(row.stock),
    isActive: Boolean(row.is_active)
  }
}

function orderFromRow(row) {
  return {
    id: Number(row.id),
    merchantOrderId: row.merchant_order_id,
    paymentProvider: row.payment_provider,
    paymentMode: row.payment_mode,
    paymentStatus: row.payment_status,
    orderStatus: row.order_status,
    customerName: row.customer_name,
    customerEmail: row.customer_email,
    customerPhone: row.customer_phone,
    shippingAddressLine1: row.shipping_address_line1,
    shippingAddressLine2: row.shipping_address_line2,
    shippingCity: row.shipping_city,
    shippingState: row.shipping_state,
    shippingPostalCode: row.shipping_postal_code,
    subtotal: Number(row.subtotal),
    shippingFee: Number(row.shipping_fee),
    total: Number(row.total),
    items: parseJson(row.items_json, []),
    paymentMeta: parseJson(row.payment_meta_json, null),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

migrateProductsFromJson()
migrateOrdersFromJson()

export async function readCollection(name) {
  if (name === "products") {
    const rows = database
      .prepare(
        `SELECT id, name, price, brand, category, image, images_json, description, stock, is_active
         FROM products
         ORDER BY id ASC`
      )
      .all()

    return rows.map(productFromRow)
  }

  if (name === "orders") {
    const rows = database
      .prepare(
        `SELECT
          id,
          merchant_order_id,
          payment_provider,
          payment_mode,
          payment_status,
          order_status,
          customer_name,
          customer_email,
          customer_phone,
          shipping_address_line1,
          shipping_address_line2,
          shipping_city,
          shipping_state,
          shipping_postal_code,
          subtotal,
          shipping_fee,
          total,
          items_json,
          payment_meta_json,
          created_at,
          updated_at
         FROM orders
         ORDER BY id ASC`
      )
      .all()

    return rows.map(orderFromRow)
  }

  throw new Error(`Unknown collection: ${name}`)
}

export async function writeCollection(name, value) {
  if (!Array.isArray(value)) {
    throw new Error("Collections must be written as arrays.")
  }

  if (name === "products") {
    runInTransaction(() => {
      database.exec("DELETE FROM products")

      for (const product of value) {
        insertProduct(product)
      }
    })
    return
  }

  if (name === "orders") {
    runInTransaction(() => {
      database.exec("DELETE FROM orders")

      for (const order of value) {
        insertOrder(order)
      }
    })
    return
  }

  throw new Error(`Unknown collection: ${name}`)
}

export async function nextNumericId(name) {
  if (name === "products") {
    const row = database.prepare("SELECT COALESCE(MAX(id), 0) + 1 AS nextId FROM products").get()
    return Number(row.nextId)
  }

  if (name === "orders") {
    const row = database.prepare("SELECT COALESCE(MAX(id), 0) + 1 AS nextId FROM orders").get()
    return Number(row.nextId)
  }

  throw new Error(`Unknown collection: ${name}`)
}
