import { useContext, useMemo, useState } from "react"
import { Link, useNavigate } from "react-router-dom"

import { CartContext } from "../context/CartContext"
import {
  createRazorpayCheckout,
  openRazorpayCheckoutSession,
  verifyRazorpayPayment
} from "../services/checkout"
import { productRequiresSize } from "../utils/productOptions"
import { formatPrice } from "../utils/formatPrice"

const initialForm = {
  fullName: "",
  email: "",
  phone: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  postalCode: ""
}

function Checkout() {
  const navigate = useNavigate()
  const { cart, cartTotal } = useContext(CartContext)

  const [form, setForm] = useState(initialForm)
  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const shippingFee = useMemo(() => (cart.length > 0 ? 99 : 0), [cart.length])
  const grandTotal = cartTotal + shippingFee

  function handleChange(event) {
    const { name, value } = event.target
    setForm((prev) => ({
      ...prev,
      [name]: value
    }))
  }

  function validate() {
    const requiredFields = [
      "fullName",
      "email",
      "phone",
      "addressLine1",
      "city",
      "state",
      "postalCode"
    ]

    for (const field of requiredFields) {
      if (!form[field].trim()) {
        return "Please fill in all required customer and shipping fields."
      }
    }

    if (cart.length === 0) {
      return "Your cart is empty."
    }

    return ""
  }

  async function handleSubmit(event) {
    event.preventDefault()

    const validationMessage = validate()
    if (validationMessage) {
      setError(validationMessage)
      return
    }

    setSubmitting(true)
    setError("")

    const orderPayload = {
      customer: form,
      items: cart.map((item) => ({
        productId: item.id,
        name: item.name,
        size: item.size,
        price: item.price,
        quantity: 1,
        image: item.image
      })),
      subtotal: cartTotal,
      shippingFee,
      total: grandTotal,
      paymentProvider: "razorpay"
    }

    try {
      const result = await createRazorpayCheckout(orderPayload)

      if (result.mode === "mock" && result.redirectUrl) {
        window.location.href = result.redirectUrl
        return
      }

      await openRazorpayCheckoutSession({
        merchantOrderId: result.merchantOrderId,
        keyId: result.keyId,
        orderId: result.orderId,
        amount: result.amount,
        currency: result.currency,
        customer: result.customer,
        onSuccess: async (paymentResponse) => {
          await verifyRazorpayPayment({
            merchantOrderId: result.merchantOrderId,
            ...paymentResponse
          })
          navigate(`/checkout/success?merchantOrderId=${result.merchantOrderId}`)
        },
        onDismiss: () => {
          navigate(`/checkout/cancel?merchantOrderId=${result.merchantOrderId}`)
        }
      })
    } catch (checkoutError) {
      if (checkoutError.setupRequired) {
        navigate("/checkout/setup")
        return
      }

      setError(checkoutError.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (cart.length === 0) {
    return (
      <div className="page-shell">
        <div className="glass-panel max-w-3xl rounded-[34px] p-8 sm:p-10">
          <p className="section-label">Checkout</p>
          <h1 className="editorial-title">Your bag is empty.</h1>
          <p className="mt-4 text-stone-300">
            Add a few products first and come back when you are ready to move to payment.
          </p>
          <Link to="/shop" className="outline-button mt-8">
            Continue Shopping
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="page-shell">
      <div className="mb-12 max-w-3xl">
        <p className="section-label">Guest checkout</p>
        <h1 className="hero-title !text-4xl sm:!text-5xl">
          Delivery details first, Razorpay right after.
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-7 text-stone-300">
          We keep the form clean here, then hand the payment off to Razorpay&apos;s hosted
          flow so the experience still feels polished.
        </p>
      </div>

      <div className="grid gap-10 xl:grid-cols-[minmax(0,1fr)_380px]">
        <form className="glass-panel rounded-[34px] p-6 sm:p-8 lg:p-10" onSubmit={handleSubmit}>
          <section>
            <p className="section-label">Customer details</p>
            <div className="grid gap-4 md:grid-cols-2">
              <input
                name="fullName"
                value={form.fullName}
                onChange={handleChange}
                placeholder="Full Name"
                className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white placeholder:text-white/30"
              />
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                placeholder="Email Address"
                className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white placeholder:text-white/30"
              />
              <input
                name="phone"
                value={form.phone}
                onChange={handleChange}
                placeholder="Phone Number"
                className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white placeholder:text-white/30 md:col-span-2"
              />
            </div>
          </section>

          <section className="mt-10">
            <p className="section-label">Shipping address</p>
            <div className="grid gap-4 md:grid-cols-2">
              <input
                name="addressLine1"
                value={form.addressLine1}
                onChange={handleChange}
                placeholder="Address Line 1"
                className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white placeholder:text-white/30 md:col-span-2"
              />
              <input
                name="addressLine2"
                value={form.addressLine2}
                onChange={handleChange}
                placeholder="Address Line 2 (Optional)"
                className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white placeholder:text-white/30 md:col-span-2"
              />
              <input
                name="city"
                value={form.city}
                onChange={handleChange}
                placeholder="City"
                className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white placeholder:text-white/30"
              />
              <input
                name="state"
                value={form.state}
                onChange={handleChange}
                placeholder="State"
                className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white placeholder:text-white/30"
              />
              <input
                name="postalCode"
                value={form.postalCode}
                onChange={handleChange}
                placeholder="PIN Code"
                className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white placeholder:text-white/30 md:col-span-2"
              />
            </div>
          </section>

          {error && (
            <p className="mt-6 rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="outline-button mt-8 w-full disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            {submitting ? "Starting Payment..." : "Continue To Razorpay"}
          </button>
        </form>

        <aside className="glass-panel h-fit rounded-[34px] p-6 sm:p-8">
          <p className="section-label">Order summary</p>

          <div className="space-y-5">
            {cart.map((item, index) => (
              <div
                key={`${item.id}-${item.size}-${index}`}
                className="flex gap-4 rounded-[24px] border border-white/8 bg-white/[0.03] p-4"
              >
                <img
                  src={item.image}
                  alt={item.name}
                  className="h-[90px] w-[78px] rounded-2xl object-cover"
                />

                <div className="flex-1">
                  <p className="font-serif text-xl text-white">{item.name}</p>
                  <p className="mt-1 text-sm uppercase tracking-[0.25em] text-white/40">
                    {productRequiresSize(item) ? `Size ${item.size}` : "Collectible"}
                  </p>
                  <p className="mt-4 text-sm uppercase tracking-[0.26em] text-white">
                    {formatPrice(item.price)}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 space-y-3 border-t border-white/10 pt-6 text-sm">
            <div className="flex justify-between text-stone-300">
              <span>Subtotal</span>
              <span>{formatPrice(cartTotal)}</span>
            </div>
            <div className="flex justify-between text-stone-300">
              <span>Shipping</span>
              <span>{formatPrice(shippingFee)}</span>
            </div>
            <div className="flex justify-between border-t border-white/10 pt-4 text-base text-white">
              <span>Total</span>
              <span>{formatPrice(grandTotal)}</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}

export default Checkout
