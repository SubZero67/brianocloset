import { useContext, useEffect, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"

import { buildApiUrl } from "../config/env"
import { CartContext } from "../context/CartContext"
import {
  clearDraftOrder,
  getDraftOrder,
  reconcileRazorpayOrder
} from "../services/checkout"

function CheckoutSuccess() {
  const { clearCart } = useContext(CartContext)
  const [searchParams] = useSearchParams()
  const [order, setOrder] = useState(null)
  const [status, setStatus] = useState("loading")
  const [message, setMessage] = useState("Verifying your order status.")

  useEffect(() => {
    async function verifyOrder() {
      const merchantOrderId = searchParams.get("merchantOrderId")
      const draft = getDraftOrder()

      if (!merchantOrderId) {
        setStatus("missing")
        setMessage("We could not find an order reference for this payment return.")
        return
      }

      try {
        let response = await fetch(buildApiUrl(`/api/orders/${merchantOrderId}`))
        let data = await response.json()

        if (!response.ok) {
          throw new Error(data.message || "Unable to verify order.")
        }

        if (data.order.paymentStatus !== "paid") {
          try {
            const reconciled = await reconcileRazorpayOrder(merchantOrderId)
            data = { order: reconciled.order }
          } catch {
            // If reconciliation does not find a captured payment yet, keep the order pending.
          }
        }

        setOrder(data.order)

        if (data.order.paymentStatus === "paid") {
          clearCart()
          clearDraftOrder()
          setStatus("paid")
          setMessage("Payment confirmed. Your order is now in our fulfillment queue.")
          return
        }

        setStatus("pending")
        setMessage(
          "Payment callback is not confirmed yet. Please refresh shortly or check with admin."
        )

        if (draft) {
          setOrder((prev) => prev || draft)
        }
      } catch (error) {
        setStatus("error")
        setMessage(error.message)
      }
    }

    verifyOrder()
  }, [clearCart, searchParams])

  return (
    <div className="min-h-screen bg-black px-6 py-24 text-white md:px-16">
      <p className="mb-3 text-sm tracking-[0.3em] text-gray-500">PAYMENT STATUS</p>
      <h1 className="mb-6 text-3xl tracking-[0.3em]">
        {status === "paid" ? "ORDER CONFIRMED" : "ORDER RECEIVED"}
      </h1>

      <p className="max-w-2xl text-gray-400">{message}</p>

      {order && (
        <div className="mt-10 max-w-xl border border-gray-800 p-6">
          <p className="text-sm text-gray-500">Order reference</p>
          <p className="mt-2">{order.merchantOrderId || "Pending assignment"}</p>

          <p className="mt-5 text-sm text-gray-500">Customer</p>
          <p className="mt-2">
            {order.customerName || order.customer?.fullName || "Guest customer"}
          </p>
          <p className="mt-1 text-gray-400">
            {order.customerEmail || order.customer?.email || ""}
          </p>
          <p className="mt-1 text-gray-400">
            {order.customerPhone || order.customer?.phone || ""}
          </p>
        </div>
      )}

      <div className="mt-10 flex flex-wrap gap-4">
        <Link
          to="/shop"
          className="border border-white px-8 py-3 tracking-[0.3em] transition hover:bg-white hover:text-black"
        >
          RETURN TO SHOP
        </Link>

        <Link
          to="/cart"
          className="border border-gray-700 px-8 py-3 tracking-[0.3em] text-gray-300 transition hover:border-white hover:text-white"
        >
          VIEW CART
        </Link>
      </div>
    </div>
  )
}

export default CheckoutSuccess
