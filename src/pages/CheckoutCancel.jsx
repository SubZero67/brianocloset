import { Link } from "react-router-dom"

function CheckoutCancel() {
  return (
    <div className="min-h-screen bg-black px-6 py-24 text-white md:px-16">
      <p className="mb-3 text-sm tracking-[0.3em] text-gray-500">PAYMENT STATUS</p>
      <h1 className="mb-6 text-3xl tracking-[0.3em]">PAYMENT NOT COMPLETED</h1>

      <p className="max-w-2xl text-gray-400">
        The order can stay in a pending state until we get a final verification from Razorpay.
        For now, the customer can safely return to checkout and try again.
      </p>

      <div className="mt-10 flex flex-wrap gap-4">
        <Link
          to="/checkout"
          className="border border-white px-8 py-3 tracking-[0.3em] transition hover:bg-white hover:text-black"
        >
          TRY AGAIN
        </Link>

        <Link
          to="/cart"
          className="border border-gray-700 px-8 py-3 tracking-[0.3em] text-gray-300 transition hover:border-white hover:text-white"
        >
          BACK TO CART
        </Link>
      </div>
    </div>
  )
}

export default CheckoutCancel
