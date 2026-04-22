import { useContext, useState } from "react"

import { CartContext } from "../context/CartContext"
import { getVariantLabel, productRequiresSize } from "../utils/productOptions"
import { formatPrice } from "../utils/formatPrice"

function QuickView({ product, onClose }) {
  const { addToCart } = useContext(CartContext)
  const requiresSize = productRequiresSize(product)
  const variantLabel = getVariantLabel(product)

  const [size, setSize] = useState("")
  const [message, setMessage] = useState("")

  function handleAdd() {
    if (requiresSize && !size) {
      setMessage("Please select a size")
      return
    }

    addToCart({
      ...product,
      size: requiresSize ? size : ""
    })

    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
      <div className="glass-panel relative grid w-full max-w-[980px] gap-8 rounded-[34px] p-5 sm:p-6 lg:grid-cols-[0.95fr_1fr] lg:p-8">
        <button
          onClick={onClose}
          aria-label="Close quick view"
          className="absolute right-5 top-5 text-xs uppercase tracking-[0.3em] text-white/60 transition hover:text-white"
        >
          Close
        </button>

        <img
          src={product.image}
          alt={product.name}
          className="h-[320px] w-full rounded-[26px] object-cover md:h-[440px]"
        />

        <div className="flex flex-col justify-center pt-8 lg:pt-0">
          <p className="section-label">{product.brand}</p>
          <h2 className="font-serif text-4xl leading-tight text-white">{product.name}</h2>
          <p className="mt-5 text-sm uppercase tracking-[0.28em] text-white/50">
            {formatPrice(product.price)}
          </p>
          <p className="mt-8 text-base leading-8 text-stone-300">{product.description}</p>

          {requiresSize ? (
            <div className="mt-8 max-w-[240px]">
              <p className="mb-3 text-xs uppercase tracking-[0.35em] text-[#d6b37b]">
                {variantLabel}
              </p>
              <select
                value={size}
                onChange={(event) => {
                  setSize(event.target.value)
                  setMessage("")
                }}
                className="w-full rounded-full border border-white/10 bg-black/40 px-5 py-3 text-sm text-white"
              >
                <option value="">Choose size</option>
                <option value="S">S</option>
                <option value="M">M</option>
                <option value="L">L</option>
                <option value="XL">XL</option>
              </select>
            </div>
          ) : (
            <div className="mt-8 max-w-[320px] rounded-[24px] border border-white/10 bg-white/[0.03] px-5 py-4 text-sm leading-7 text-stone-300">
              This item ships as a display collectible, so no size selection is needed.
            </div>
          )}

          {message && <p className="mt-4 text-sm text-stone-300">{message}</p>}

          <button onClick={handleAdd} className="outline-button mt-8 w-full sm:w-auto">
            Add To Cart
          </button>
        </div>
      </div>
    </div>
  )
}

export default QuickView
