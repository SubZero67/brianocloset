import { useParams } from "react-router-dom"

import ProductCard from "../components/ProductCard"
import { useCatalog } from "../context/CatalogContext"
import brands from "../data/brands"

function Brand() {
  const { brandName } = useParams()
  const { products, loading, error } = useCatalog()
  const decodedBrand = decodeURIComponent(brandName)

  const brand = brands.find((item) => item.name === decodedBrand)
  const brandProducts = products.filter((item) => item.brand === decodedBrand)

  return (
    <div className="min-h-screen bg-black px-6 py-24 text-white md:px-16">
      {brand && (
        <div className="mb-16 flex justify-center">
          <div className="flex h-[160px] w-[320px] items-center justify-center md:w-[420px]">
            <img
              src={brand.collabLogo}
              alt={`${brand.name} collaboration logo`}
              className="max-h-full max-w-full object-contain"
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-4">
        {loading ? (
          <p className="text-gray-400">Loading products...</p>
        ) : error ? (
          <p className="text-gray-400">{error}</p>
        ) : brandProducts.length > 0 ? (
          brandProducts.map((product) => <ProductCard key={product.id} product={product} />)
        ) : (
          <p className="text-gray-400">No products available yet.</p>
        )}
      </div>
    </div>
  )
}

export default Brand
