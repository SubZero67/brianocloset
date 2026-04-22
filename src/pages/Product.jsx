import { useContext, useEffect, useMemo, useRef, useState } from "react"
import { useParams } from "react-router-dom"

import ProductCard from "../components/ProductCard"
import { useCatalog } from "../context/CatalogContext"
import { CartContext } from "../context/CartContext"
import brands from "../data/brands"
import { getVariantLabel, productRequiresSize } from "../utils/productOptions"
import { formatPrice } from "../utils/formatPrice"

function Product() {
  const { id } = useParams()
  const { products, loading, error } = useCatalog()
  const { addToCart } = useContext(CartContext)

  const [selectedSize, setSelectedSize] = useState("")
  const [message, setMessage] = useState("")
  const [activeImage, setActiveImage] = useState("")
  const timeoutRef = useRef(undefined)

  const product = useMemo(
    () => products.find((item) => item.id === Number(id)),
    [id, products]
  )

  useEffect(() => {
    return () => window.clearTimeout(timeoutRef.current)
  }, [])

  if (loading) {
    return <div className="page-shell">Loading product...</div>
  }

  if (error) {
    return <div className="page-shell">{error}</div>
  }

  if (!product) {
    return <div className="page-shell">Product not found.</div>
  }

  const brand = brands.find((item) => item.name === product.brand)
  const productImages = (product.images?.length ? product.images : [product.image]).filter(Boolean)
  const requiresSize = productRequiresSize(product)
  const variantLabel = getVariantLabel(product)

  const recommendedProducts = products
    .filter((item) => item.brand === product.brand && item.id !== product.id)
    .slice(0, 4)

  function showMessage(nextMessage) {
    setMessage(nextMessage)

    window.clearTimeout(timeoutRef.current)
    timeoutRef.current = window.setTimeout(() => {
      setMessage("")
    }, 2000)
  }

  useEffect(() => {
    setActiveImage(productImages[0] || product.image)
  }, [product.id])

  function handleAddToCart() {
    if (requiresSize && !selectedSize) {
      showMessage("Please select a size")
      return
    }

    addToCart({
      ...product,
      size: requiresSize ? selectedSize : ""
    })

    showMessage("Added to cart")
  }

  return (
    <div className="page-shell">
      <div className="grid gap-10 xl:grid-cols-[minmax(0,1.1fr)_minmax(380px,0.9fr)]">
        <div className="surface-card overflow-hidden rounded-[34px] p-3 sm:p-4">
          <img
            src={activeImage || product.image}
            alt={product.name}
            className="h-[420px] w-full rounded-[26px] object-cover md:h-[680px]"
          />

          {productImages.length > 1 && (
            <div className="mt-4 grid grid-cols-4 gap-3">
              {productImages.map((image, index) => (
                <button
                  key={`${product.id}-image-${index}`}
                  type="button"
                  onClick={() => setActiveImage(image)}
                  className={`overflow-hidden rounded-[20px] border p-1 transition ${
                    activeImage === image
                      ? "border-[#d6b37b] bg-[#d6b37b]/10"
                      : "border-white/10 bg-black/40"
                  }`}
                >
                  <img
                    src={image}
                    alt={`${product.name} view ${index + 1}`}
                    className="h-20 w-full rounded-[16px] object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="glass-panel rounded-[34px] p-6 sm:p-8 lg:p-10">
          {brand && (
            <div className="mb-8 flex h-[88px] items-center">
              <img
                src={brand.collabLogo}
                alt={`${brand.name} collaboration logo`}
                className="max-h-full max-w-[240px] object-contain object-left"
              />
            </div>
          )}

          <p className="section-label">{product.brand}</p>
          <h1 className="hero-title !text-4xl sm:!text-5xl">{product.name}</h1>
          <p className="mt-5 text-sm uppercase tracking-[0.3em] text-white/55">
            {product.category}
          </p>
          <p className="mt-8 text-2xl text-white">{formatPrice(product.price)}</p>
          <p className="mt-8 max-w-xl text-base leading-8 text-stone-300">
            {product.description}
          </p>

          <div className="mt-10 grid gap-6 border-t border-white/10 pt-8 sm:grid-cols-[220px_1fr]">
            <div>
              {requiresSize ? (
                <>
                  <p className="mb-3 text-xs uppercase tracking-[0.35em] text-[#d6b37b]">
                    Select {variantLabel.toLowerCase()}
                  </p>
                  <select
                    value={selectedSize}
                    onChange={(event) => setSelectedSize(event.target.value)}
                    className="w-full rounded-full border border-white/15 bg-black/50 px-5 py-3 text-sm text-white"
                  >
                    <option value="">Choose size</option>
                    <option value="S">S</option>
                    <option value="M">M</option>
                    <option value="L">L</option>
                    <option value="XL">XL</option>
                  </select>
                </>
              ) : (
                <>
                  <p className="mb-3 text-xs uppercase tracking-[0.35em] text-[#d6b37b]">
                    Collectible format
                  </p>
                  <div className="rounded-[24px] border border-white/10 bg-white/[0.03] px-5 py-4 text-sm leading-7 text-stone-300">
                    No size selection needed for collectibles and toy cars.
                  </div>
                </>
              )}
            </div>

            <div className="flex flex-col justify-end gap-4">
              {message && (
                <div className="rounded-full border border-white/15 bg-white/5 px-4 py-3 text-sm text-stone-200">
                  {message}
                </div>
              )}

              <button onClick={handleAddToCart} className="outline-button w-full sm:w-auto">
                Add To Cart
              </button>
            </div>
          </div>
        </div>
      </div>

      {recommendedProducts.length > 0 && (
        <section className="mt-20">
          <div className="mb-10 max-w-2xl">
            <p className="section-label">Suggested next</p>
            <h2 className="editorial-title">More from the same performance world.</h2>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 2xl:grid-cols-4">
            {recommendedProducts.map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

export default Product
