import { Link } from "react-router-dom"

function CheckoutSetup() {
  return (
    <div className="min-h-screen bg-black px-6 py-24 text-white md:px-16">
      <p className="mb-3 text-sm tracking-[0.3em] text-gray-500">RAZORPAY SETUP</p>
      <h1 className="mb-6 text-3xl tracking-[0.3em]">PAYMENT CONNECTION PENDING</h1>

      <p className="max-w-2xl text-gray-400">
        The guest checkout flow is ready, but live Razorpay credentials are not connected
        yet. Next we need the key id and key secret on the server so checkout can create a
        real Razorpay order and verify successful payments.
      </p>

      <div className="mt-10 flex flex-wrap gap-4">
        <Link
          to="/checkout"
          className="border border-white px-8 py-3 tracking-[0.3em] transition hover:bg-white hover:text-black"
        >
          BACK TO CHECKOUT
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

export default CheckoutSetup
