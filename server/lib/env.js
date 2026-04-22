import crypto from "node:crypto"

import { loadServerEnvFile } from "./loadEnv.js"

loadServerEnvFile()

function env(name, fallback = "") {
  return process.env[name] || fallback
}

export const serverEnv = {
  nodeEnv: env("NODE_ENV", "development"),
  port: Number(env("PORT", "4000")),
  frontendUrl: env("FRONTEND_URL", "http://localhost:5173"),
  serverUrl: env("SERVER_URL", "http://localhost:4000"),
  databasePath: env("DATABASE_PATH", "server/data/store.db"),
  adminUsername: env("ADMIN_USERNAME", "admin"),
  adminPassword: env("ADMIN_PASSWORD", "change-me"),
  adminPasswordHash: env("ADMIN_PASSWORD_HASH"),
  sessionSecret: env("SESSION_SECRET", crypto.randomBytes(32).toString("hex")),
  sessionTtlMs: Number(env("SESSION_TTL_MS", String(1000 * 60 * 60 * 12))),
  loginWindowMs: Number(env("LOGIN_WINDOW_MS", String(1000 * 60 * 15))),
  loginMaxAttempts: Number(env("LOGIN_MAX_ATTEMPTS", "5")),
  adminWindowMs: Number(env("ADMIN_WINDOW_MS", String(1000 * 60 * 15))),
  adminMaxRequests: Number(env("ADMIN_MAX_REQUESTS", "300")),
  checkoutWindowMs: Number(env("CHECKOUT_WINDOW_MS", String(1000 * 60 * 10))),
  checkoutMaxRequests: Number(env("CHECKOUT_MAX_REQUESTS", "30")),
  auditLogPath: env("AUDIT_LOG_PATH", "server/data/audit.log"),
  razorpayEnabled: env("RAZORPAY_ENABLED", "false") === "true",
  razorpayKeyId: env("RAZORPAY_KEY_ID"),
  razorpayKeySecret: env("RAZORPAY_KEY_SECRET"),
  razorpayWebhookSecret: env("RAZORPAY_WEBHOOK_SECRET"),
  razorpayBaseUrl: env("RAZORPAY_BASE_URL", "https://api.razorpay.com")
}
