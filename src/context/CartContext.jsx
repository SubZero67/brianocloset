import { createContext, useEffect, useMemo, useState } from "react"

export const CartContext = createContext()

export function CartProvider({ children }) {
  const [cart, setCart] = useState(() => {
    const saved = localStorage.getItem("cart")
    return saved ? JSON.parse(saved) : []
  })

  const [cartOpen, setCartOpen] = useState(false)

  useEffect(() => {
    localStorage.setItem("cart", JSON.stringify(cart))
  }, [cart])

  const cartTotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.price, 0),
    [cart]
  )

  function addToCart(product) {
    setCart((prev) => [...prev, product])
    setCartOpen(true)
  }

  function removeFromCart(index) {
    setCart((prev) => prev.filter((_, itemIndex) => itemIndex !== index))
  }

  function clearCart() {
    setCart([])
  }

  function closeCart() {
    setCartOpen(false)
  }

  function openCart() {
    setCartOpen(true)
  }

  return (
    <CartContext.Provider
      value={{
        cart,
        cartTotal,
        addToCart,
        removeFromCart,
        clearCart,
        cartOpen,
        openCart,
        closeCart
      }}
    >
      {children}
    </CartContext.Provider>
  )
}
