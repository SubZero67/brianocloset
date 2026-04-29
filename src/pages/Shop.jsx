import { useEffect, useState } from "react"
import { useSearchParams } from "react-router-dom"

import ProductCard from "../components/ProductCard"
import { useCatalog } from "../context/CatalogContext"
import categoriesList from "../data/categories"
import brands from "../data/brands"

function Shop() {
  const { products, loading, error } = useCatalog()
  const [searchParams, setSearchParams] = useSearchParams()
  const [selectedBrand, setSelectedBrand] = useState(
    searchParams.get("brand") || "All"
  )
  const [selectedCategory, setSelectedCategory] = useState(
    searchParams.get("category") || "All"
  )

  const categories = [
    "All",
    ...new Set([...categoriesList, ...products.map((product) => product.category)])
  ]
  const availableBrands = [
    "All",
    ...new Set([
      ...brands.map((brand) => brand.name),
      ...products.map((product) => product.brand)
    ])
  ]

  useEffect(() => {
    setSelectedBrand(searchParams.get("brand") || "All")
    setSelectedCategory(searchParams.get("category") || "All")
  }, [searchParams])

  function updateFilters(nextBrand, nextCategory) {
    setSelectedBrand(nextBrand)
    setSelectedCategory(nextCategory)

    const nextParams = new URLSearchParams()

    if (nextBrand !== "All") {
      nextParams.set("brand", nextBrand)
    }

    if (nextCategory !== "All") {
      nextParams.set("category", nextCategory)
    }

    setSearchParams(nextParams)
  }

  const filteredProducts = products.filter((product) => {
    const brandMatch = selectedBrand === "All" || product.brand === selectedBrand
    const categoryMatch =
      selectedCategory === "All" || product.category === selectedCategory

    return brandMatch && categoryMatch
  })

  function selectBrand(brandName) {
    updateFilters(brandName, "All")
  }

  function selectCategory(category) {
    updateFilters("All", category)
  }

  function filterClass(isActive) {
    return isActive
      ? "border-[#d6b37b] bg-[#d6b37b]/10 text-white"
      : "border-white/10 text-white/55 hover:border-white/30 hover:text-white"
  }

  return (
    <div className="page-shell">
      <div className="mb-14 grid gap-8 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-end">
        <div>
          <p className="section-label">Shop the line</p>
          <h1 className="hero-title max-w-4xl !text-4xl sm:!text-5xl lg:!text-6xl">
            Curated drops with a cleaner, more premium showroom feel.
          </h1>
        </div>

        <div className="glass-panel rounded-[28px] p-6">
          <p className="text-xs uppercase tracking-[0.35em] text-[#d6b37b]">
            Inventory snapshot
          </p>
          <div className="mt-5 grid grid-cols-2 gap-4 text-sm">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-white/45">Products</p>
              <p className="mt-2 text-2xl text-white">{products.length}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-white/45">Brands</p>
              <p className="mt-2 text-2xl text-white">{availableBrands.length - 1}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-10 xl:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="glass-panel h-fit rounded-[28px] p-6 sm:p-7">
          <div>
            <p className="section-label">Brand filter</p>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => selectBrand("All")}
                className={`rounded-full border px-4 py-2 text-xs uppercase tracking-[0.3em] transition ${filterClass(
                  selectedBrand === "All"
                )}`}
              >
                All brands
              </button>

              {availableBrands
                .filter((brandName) => brandName !== "All")
                .map((brandName) => (
                <button
                  key={brandName}
                  onClick={() => selectBrand(brandName)}
                  className={`rounded-full border px-4 py-2 text-xs uppercase tracking-[0.3em] transition ${filterClass(
                    selectedBrand === brandName
                  )}`}
                >
                  {brandName}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-10">
            <p className="section-label">Category filter</p>
            <div className="flex flex-wrap gap-3">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => selectCategory(category)}
                  className={`rounded-full border px-4 py-2 text-xs uppercase tracking-[0.3em] transition ${filterClass(
                    selectedCategory === category
                  )}`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        </aside>

        <section>
          <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.32em] text-white/45">
                Available now
              </p>
              <h2 className="mt-2 font-serif text-3xl text-white">
                {filteredProducts.length} piece{filteredProducts.length === 1 ? "" : "s"} in
                the current selection
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 2xl:grid-cols-3">
            {loading ? (
              <div className="glass-panel rounded-[28px] p-8 text-center text-stone-300">
                Loading products...
              </div>
            ) : error ? (
              <div className="glass-panel rounded-[28px] p-8 text-center text-stone-300">
                {error}
              </div>
            ) : filteredProducts.length > 0 ? (
              filteredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))
            ) : (
              <div className="glass-panel rounded-[28px] p-8 text-center text-stone-300">
                No products match this filter right now.
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}

export default Shop
