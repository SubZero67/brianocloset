import crypto from "node:crypto"

import { serverEnv } from "./env.js"

const sessions = new Map()
const rateLimits = new Map()

function now() {
  return Date.now()
}

function getRateLimitKey(request, scope) {
  return `${scope}:${request.socket.remoteAddress || "unknown"}`
}

export function applyRateLimit(request, scope, limit, windowMs) {
  const key = getRateLimitKey(request, scope)
  const currentTime = now()
  const entry = rateLimits.get(key)

  if (!entry || currentTime > entry.resetAt) {
    rateLimits.set(key, {
      count: 1,
      resetAt: currentTime + windowMs
    })
    return { allowed: true }
  }

  entry.count += 1

  if (entry.count > limit) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((entry.resetAt - currentTime) / 1000)
    }
  }

  return { allowed: true }
}

function pruneSessions() {
  const currentTime = now()

  for (const [token, session] of sessions.entries()) {
    if (session.expiresAt <= currentTime) {
      sessions.delete(token)
    }
  }
}

export function createSession(username) {
  pruneSessions()

  const token = crypto.randomBytes(32).toString("hex")
  const tokenHash = crypto
    .createHmac("sha256", serverEnv.sessionSecret)
    .update(token)
    .digest("hex")

  sessions.set(tokenHash, {
    username,
    expiresAt: now() + serverEnv.sessionTtlMs
  })

  return token
}

export function getSession(request) {
  pruneSessions()

  const cookieHeader = request.headers.cookie || ""
  const cookies = Object.fromEntries(
    cookieHeader
      .split(";")
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => {
        const separatorIndex = item.indexOf("=")
        if (separatorIndex === -1) {
          return [item, ""]
        }

        return [
          item.slice(0, separatorIndex),
          decodeURIComponent(item.slice(separatorIndex + 1))
        ]
      })
  )

  const rawToken = cookies.boc_admin_session

  if (!rawToken) {
    return null
  }

  const tokenHash = crypto
    .createHmac("sha256", serverEnv.sessionSecret)
    .update(rawToken)
    .digest("hex")

  const session = sessions.get(tokenHash)

  if (!session || session.expiresAt <= now()) {
    sessions.delete(tokenHash)
    return null
  }

  return session
}

export function destroySession(request) {
  const cookieHeader = request.headers.cookie || ""
  const sessionToken = cookieHeader
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith("boc_admin_session="))

  if (!sessionToken) {
    return
  }

  const rawToken = decodeURIComponent(sessionToken.split("=")[1] || "")
  const tokenHash = crypto
    .createHmac("sha256", serverEnv.sessionSecret)
    .update(rawToken)
    .digest("hex")

  sessions.delete(tokenHash)
}

export function buildSessionCookie(token, expiresAt) {
  const secureFlag = serverEnv.frontendUrl.startsWith("https://") ? "; Secure" : ""
  return [
    `boc_admin_session=${encodeURIComponent(token)}`,
    "HttpOnly",
    "Path=/",
    "SameSite=Lax",
    secureFlag,
    `Max-Age=${Math.floor((expiresAt - now()) / 1000)}`
  ]
    .filter(Boolean)
    .join("; ")
}

export function buildExpiredSessionCookie() {
  const secureFlag = serverEnv.frontendUrl.startsWith("https://") ? "; Secure" : ""
  return `boc_admin_session=; HttpOnly; Path=/; SameSite=Lax${secureFlag}; Max-Age=0`
}

export function hashPassword(password, iterations = 120000) {
  const salt = crypto.randomBytes(16).toString("hex")
  const hash = crypto
    .pbkdf2Sync(password, salt, iterations, 64, "sha512")
    .toString("hex")

  return `${iterations}:${salt}:${hash}`
}

export function verifyPassword(password, storedPassword, storedHash) {
  if (storedHash) {
    const [iterationsText, salt, hash] = storedHash.split(":")
    const iterations = Number(iterationsText)

    if (!iterations || !salt || !hash) {
      return false
    }

    const derived = crypto
      .pbkdf2Sync(password, salt, iterations, 64, "sha512")
      .toString("hex")

    return crypto.timingSafeEqual(Buffer.from(derived), Buffer.from(hash))
  }

  const provided = Buffer.from(password)
  const expected = Buffer.from(storedPassword)

  if (provided.length !== expected.length) {
    return false
  }

  return crypto.timingSafeEqual(provided, expected)
}

export function ensureAllowedOrigin(request, allowNoOrigin = false) {
  const origin = request.headers.origin

  if (!origin) {
    return allowNoOrigin
  }

  return origin === serverEnv.frontendUrl
}

export function assertProductionSafety() {
  if (serverEnv.nodeEnv !== "production") {
    return
  }

  if (!serverEnv.adminPasswordHash) {
    throw new Error(
      "Production requires ADMIN_PASSWORD_HASH. Do not use plain ADMIN_PASSWORD."
    )
  }

  if (
    !serverEnv.sessionSecret ||
    serverEnv.sessionSecret === "change-this-session-secret"
  ) {
    throw new Error("Production requires a strong SESSION_SECRET.")
  }
}
