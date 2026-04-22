import { useContext } from "react"
import { Link } from "react-router-dom"

import { CartContext } from "../context/CartContext"
import { productRequiresSize } from "../utils/productOptions"
import { formatPrice } from "../utils/formatPrice"

function Cart() {
  const { cart, cartTotal, removeFromCart } = useContext(CartContext)

  return (
    <div className="min-h-screen bg-black px-6 py-24 text-white md:px-16">
      <h1 className="mb-12 text-3xl tracking-[0.3em]">CART</h1>

      {cart.length === 0 && <p className="text-gray-400">Your cart is empty.</p>}

      {cart.map((item, index) => (
        <div
          key={`${item.id}-${item.size}-${index}`}
          className="flex flex-col justify-between gap-6 border-b border-gray-700 py-6 md:flex-row md:items-center"
        >
          <div className="flex items-center gap-6">
            <img
              src={item.image}
              alt={item.name}
              className="h-[150px] w-[120px] object-cover"
            />

            <div>
              <h2 className="text-sm tracking-[0.15em]">{item.name}</h2>
              {productRequiresSize(item) ? (
                <p className="mt-1 text-sm text-gray-400">Size: {item.size}</p>
              ) : (
                <p className="mt-1 text-sm text-gray-400">Collectible item</p>
              )}
              <p className="mt-1 text-sm text-gray-400">{formatPrice(item.price)}</p>
            </div>
          </div>

          <button
            onClick={() => removeFromCart(index)}
            className="text-left text-sm tracking-[0.15em] text-red-400 hover:text-red-300 md:text-right"
          >
            REMOVE
          </button>
        </div>
      ))}

      {cart.length > 0 && (
        <div className="mt-12">
          <h2 className="mb-6 text-xl tracking-[0.2em]">Total: {formatPrice(cartTotal)}</h2>

          <Link
            to="/checkout"
            className="inline-block border border-white px-12 py-4 tracking-[0.3em] transition duration-500 hover:bg-white hover:text-black"
          >
            CHECKOUT
          </Link>
        </div>
      )}
    </div>
  )
}

export default Cart
