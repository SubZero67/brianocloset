import { RAZORPAY_ENABLED, buildApiUrl } from "../config/env"

const DRAFT_ORDER_KEY = "razorpay_checkout_draft"

function loadRazorpayScript() {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) {
      resolve(window.Razorpay)
      return
    }

    const existingScript = document.querySelector('script[data-razorpay-checkout="true"]')

    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(window.Razorpay), {
        once: true
      })
      existingScript.addEventListener(
        "error",
        () => reject(new Error("Unable to load Razorpay checkout.")),
        { once: true }
      )
      return
    }

    const script = document.createElement("script")
    script.src = "https://checkout.razorpay.com/v1/checkout.js"
    script.async = true
    script.dataset.razorpayCheckout = "true"
    script.onload = () => resolve(window.Razorpay)
    script.onerror = () => reject(new Error("Unable to load Razorpay checkout."))
    document.body.appendChild(script)
  })
}

export function saveDraftOrder(order) {
  localStorage.setItem(DRAFT_ORDER_KEY, JSON.stringify(order))
}

export function getDraftOrder() {
  const saved = localStorage.getItem(DRAFT_ORDER_KEY)
  return saved ? JSON.parse(saved) : null
}

export function clearDraftOrder() {
  localStorage.removeItem(DRAFT_ORDER_KEY)
}

export async function createRazorpayCheckout(order) {
  saveDraftOrder(order)

  const response = await fetch(buildApiUrl("/api/payments/razorpay/checkout"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(order)
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.message || "Unable to start Razorpay checkout.")
  }

  return {
    ok: true,
    mode: data.mode || (RAZORPAY_ENABLED ? "live" : "mock"),
    redirectUrl: data.redirectUrl,
    merchantOrderId: data.merchantOrderId,
    keyId: data.keyId,
    orderId: data.orderId,
    amount: data.amount,
    currency: data.currency,
    customer: data.customer
  }
}

export async function verifyRazorpayPayment(payload) {
  const response = await fetch(buildApiUrl("/api/payments/razorpay/verify"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.message || "Unable to verify Razorpay payment.")
  }

  return data
}

export async function reconcileRazorpayOrder(merchantOrderId) {
  const response = await fetch(
    buildApiUrl(`/api/payments/razorpay/reconcile/${merchantOrderId}`),
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      }
    }
  )

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.message || "Unable to reconcile Razorpay payment.")
  }

  return data
}

export async function openRazorpayCheckoutSession({
  merchantOrderId,
  keyId,
  orderId,
  amount,
  currency,
  customer,
  onSuccess,
  onDismiss
}) {
  const Razorpay = await loadRazorpayScript()

  return new Promise((resolve, reject) => {
    const instance = new Razorpay({
      key: keyId,
      amount,
      currency,
      name: "Brian O Closet",
      description: "Complete your order",
      order_id: orderId,
      prefill: {
        name: customer?.name || "",
        email: customer?.email || "",
        contact: customer?.contact || ""
      },
      notes: {
        merchantOrderId
      },
      theme: {
        color: "#d6b37b"
      },
      handler: async (response) => {
        try {
          await onSuccess(response)
          resolve(response)
        } catch (error) {
          reject(error)
        }
      },
      modal: {
        ondismiss: () => {
          onDismiss?.()
          resolve(null)
        }
      }
    })

    instance.open()
  })
}
