import { buildApiUrl } from "../config/env"

const ADMIN_FLAG_KEY = "boc_admin_authenticated"

function adminHeaders() {
  return {
    "Content-Type": "application/json"
  }
}

async function parseJson(response) {
  const raw = await response.text()
  const data = raw ? JSON.parse(raw) : null

  if (!response.ok) {
    throw new Error(data?.message || "Request failed.")
  }

  if (!data) {
    throw new Error("The server returned an empty response.")
  }

  return data
}

async function requestJson(url, options = {}) {
  try {
    const response = await fetch(buildApiUrl(url), {
      credentials: "include",
      ...options
    })

    return await parseJson(response)
  } catch (error) {
    if (
      error instanceof SyntaxError ||
      error.message === "The server returned an empty response."
    ) {
      throw new Error(
        "The admin API did not return valid data. Make sure `npm.cmd run server` is running."
      )
    }

    if (error instanceof TypeError) {
      throw new Error(
        "Unable to reach the admin API. Start the backend with `npm.cmd run server` and try again."
      )
    }

    throw error
  }
}

export function getAdminToken() {
  return localStorage.getItem(ADMIN_FLAG_KEY)
}

export async function logoutAdmin() {
  try {
    await requestJson("/api/admin/logout", {
      method: "POST",
      headers: adminHeaders()
    })
  } finally {
    localStorage.removeItem(ADMIN_FLAG_KEY)
  }
}

export async function loginAdmin(credentials) {
  const data = await requestJson("/api/admin/login", {
    method: "POST",
    headers: adminHeaders(),
    body: JSON.stringify(credentials)
  })

  localStorage.setItem(ADMIN_FLAG_KEY, "true")
  return data
}

export async function fetchAdminSession() {
  return requestJson("/api/admin/session", {
    method: "GET",
    headers: adminHeaders()
  })
}

export async function fetchAdminProducts() {
  return requestJson("/api/admin/products", {
    headers: adminHeaders()
  })
}

export async function createAdminProduct(product) {
  return requestJson("/api/admin/products", {
    method: "POST",
    headers: adminHeaders(),
    body: JSON.stringify(product)
  })
}

export async function updateAdminProduct(productId, product) {
  return requestJson(`/api/admin/products/${productId}`, {
    method: "PATCH",
    headers: adminHeaders(),
    body: JSON.stringify(product)
  })
}

export async function deleteAdminProduct(productId) {
  return requestJson(`/api/admin/products/delete/${productId}`, {
    method: "POST",
    headers: adminHeaders()
  })
}

export async function fetchAdminOrders() {
  return requestJson("/api/admin/orders", {
    headers: adminHeaders()
  })
}

export async function updateAdminOrder(orderId, payload) {
  return requestJson(`/api/admin/orders/${orderId}`, {
    method: "PATCH",
    headers: adminHeaders(),
    body: JSON.stringify(payload)
  })
}

export async function deleteAdminOrder(orderId) {
  return requestJson(`/api/admin/orders/delete/${orderId}`, {
    method: "POST",
    headers: adminHeaders()
  })
}
