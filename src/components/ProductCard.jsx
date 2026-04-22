import { useState } from "react"
import { Link } from "react-router-dom"

import { formatPrice } from "../utils/formatPrice"
import QuickView from "./QuickView"

function ProductCard({ product }) {
  const [showQuickView, setShowQuickView] = useState(false)
  const primaryImage = product.images?.[0] || product.image

  return (
    <>
      <Link to={`/product/${product.id}`} className="group block">
        <article className="surface-card overflow-hidden rounded-[28px]">
          <div className="relative overflow-hidden">
            <img
              src={primaryImage}
              alt={product.name}
              className="h-[360px] w-full object-cover transition duration-700 group-hover:scale-[1.04] md:h-[430px]"
            />

            <div className="absolute inset-x-0 bottom-0 bg-[linear-gradient(180deg,transparent,rgba(0,0,0,0.78))] p-5 opacity-0 transition duration-300 group-hover:opacity-100">
              <button
                onClick={(event) => {
                  event.preventDefault()
                  setShowQuickView(true)
                }}
                className="outline-button w-full"
              >
                Quick View
              </button>
            </div>
          </div>

          <div className="p-5 sm:p-6">
            <div className="mb-3 flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.35em] text-[#d6b37b]">
                  {product.brand}
                </p>
                <h2 className="mt-2 font-serif text-2xl leading-tight text-white">
                  {product.name}
                </h2>
              </div>

              <span className="text-sm uppercase tracking-[0.25em] text-white/40">
                {product.category}
              </span>
            </div>

            <div className="flex items-end justify-between gap-4">
              <p className="text-sm leading-6 text-stone-400">{product.description}</p>
              <p className="shrink-0 text-sm uppercase tracking-[0.26em] text-white">
                {formatPrice(product.price)}
              </p>
            </div>
          </div>
        </article>
      </Link>

      {showQuickView && (
        <QuickView product={product} onClose={() => setShowQuickView(false)} />
      )}
    </>
  )
}

export default ProductCard
