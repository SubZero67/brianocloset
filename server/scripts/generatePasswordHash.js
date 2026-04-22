import readline from "node:readline/promises"
import { stdin as input, stdout as output } from "node:process"

import { hashPassword } from "../lib/security.js"

const rl = readline.createInterface({ input, output })

try {
  const password = await rl.question("Enter admin password: ")

  if (!password.trim()) {
    console.error("Password is required.")
    process.exitCode = 1
  } else {
    console.log("\nADMIN_PASSWORD_HASH=" + hashPassword(password))
  }
} finally {
  rl.close()
}
