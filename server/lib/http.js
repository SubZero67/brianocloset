import { serverEnv } from "./env.js"

function corsOrigin(request) {
  const requestOrigin = request.headers.origin

  if (!requestOrigin) {
    return serverEnv.frontendUrl
  }

  return requestOrigin === serverEnv.frontendUrl ? requestOrigin : "null"
}

export function sendJson(request, response, statusCode, payload, extraHeaders = {}) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": corsOrigin(request),
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "no-referrer",
    ...extraHeaders
  })

  response.end(JSON.stringify(payload))
}

export async function readRawBody(request, maxBytes = 1024 * 1024) {
  const chunks = []
  let totalBytes = 0

  for await (const chunk of request) {
    totalBytes += chunk.length

    if (totalBytes > maxBytes) {
      throw new Error("Request body too large.")
    }

    chunks.push(chunk)
  }

  if (chunks.length === 0) {
    return ""
  }

  return Buffer.concat(chunks).toString("utf8")
}

export async function readJsonBody(request, maxBytes = 1024 * 1024) {
  const rawBody = await readRawBody(request, maxBytes)

  if (!rawBody) {
    return {}
  }

  try {
    return JSON.parse(rawBody)
  } catch {
    throw new Error("Invalid JSON payload.")
  }
}

export function notFound(request, response) {
  sendJson(request, response, 404, {
    message: "Route not found."
  })
}
