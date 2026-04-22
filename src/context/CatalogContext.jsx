import { createContext, useContext, useEffect, useState } from "react"

import { buildApiUrl } from "../config/env"

const CatalogContext = createContext(null)

export function CatalogProvider({ children }) {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    async function loadProducts() {
      setLoading(true)

      try {
        const response = await fetch(buildApiUrl("/api/products"))
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.message || "Unable to load products.")
        }

        setProducts(data.products || [])
        setError("")
      } catch (nextError) {
        setError(nextError.message || "Unable to load products.")
        setProducts([])
      } finally {
        setLoading(false)
      }
    }

    loadProducts()
  }, [])

  return (
    <CatalogContext.Provider
      value={{
        products,
        loading,
        error
      }}
    >
      {children}
    </CatalogContext.Provider>
  )
}

export function useCatalog() {
  const value = useContext(CatalogContext)

  if (!value) {
    throw new Error("useCatalog must be used inside CatalogProvider.")
  }

  return value
}
