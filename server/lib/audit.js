import { appendFile, mkdir } from "node:fs/promises"
import path from "node:path"

import { serverEnv } from "./env.js"

export async function writeAuditLog(entry) {
  const filePath = path.resolve(serverEnv.auditLogPath)
  await mkdir(path.dirname(filePath), { recursive: true })
  await appendFile(
    filePath,
    JSON.stringify({
      at: new Date().toISOString(),
      ...entry
    }) + "\n",
    "utf8"
  )
}
