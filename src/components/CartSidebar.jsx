import { useContext } from "react"
import { Link } from "react-router-dom"

import { CartContext } from "../context/CartContext"
import { productRequiresSize } from "../utils/productOptions"
import { formatPrice } from "../utils/formatPrice"

function CartSidebar({ isOpen, onClose }) {
  const { cart, cartTotal, removeFromCart } = useContext(CartContext)

  return (
    <div className={`fixed inset-0 z-50 ${isOpen ? "visible" : "invisible"}`}>
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-black/70 backdrop-blur-sm transition ${
          isOpen ? "opacity-100" : "opacity-0"
        }`}
      />

      <aside
        className={`absolute right-0 top-0 flex h-full w-full max-w-[430px] flex-col border-l border-white/10 bg-[#090909] p-6 shadow-[0_25px_80px_rgba(0,0,0,0.55)] transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="mb-8 flex items-center justify-between border-b border-white/10 pb-5">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-[#d6b37b]">Current bag</p>
            <h2 className="mt-2 font-serif text-3xl text-white">Cart</h2>
          </div>

          <button onClick={onClose} className="text-xs uppercase tracking-[0.3em] text-white/60">
            Close
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto pr-1">
          {cart.length === 0 && (
            <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-5 text-sm text-stone-300">
              Your cart is empty.
            </div>
          )}

          {cart.map((item, index) => (
            <div
              key={`${item.id}-${item.size}-${index}`}
              className="rounded-[28px] border border-white/8 bg-white/[0.03] p-4"
            >
              <div className="flex gap-4">
                <img
                  src={item.image}
                  alt={item.name}
                  className="h-[98px] w-[82px] rounded-[22px] object-cover"
                />

                <div className="flex-1">
                  <p className="font-serif text-xl text-white">{item.name}</p>
                  <p className="mt-1 text-[11px] uppercase tracking-[0.3em] text-white/40">
                    {productRequiresSize(item) ? `Size ${item.size}` : "Collectible"}
                  </p>
                  <p className="mt-4 text-sm uppercase tracking-[0.26em] text-white">
                    {formatPrice(item.price)}
                  </p>

                  <button
                    onClick={() => removeFromCart(index)}
                    className="mt-4 text-xs uppercase tracking-[0.28em] text-red-300"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 border-t border-white/10 pt-6">
          <div className="mb-6 flex items-center justify-between">
            <p className="text-sm uppercase tracking-[0.28em] text-white/45">Total</p>
            <p className="font-serif text-2xl text-white">{formatPrice(cartTotal)}</p>
          </div>

          <Link to="/checkout" onClick={onClose} className="outline-button w-full">
            Checkout
          </Link>
        </div>
      </aside>
    </div>
  )
}

export default CartSidebar
