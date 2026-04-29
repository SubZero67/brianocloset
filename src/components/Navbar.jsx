import { useContext, useEffect, useState } from "react"
import { Link, useLocation } from "react-router-dom"

import logo from "../assets/logo.png"
import { CartContext } from "../context/CartContext"
import CartSidebar from "./CartSidebar"

function Navbar() {
  const { pathname } = useLocation()
  const { cart, cartOpen, openCart, closeCart } = useContext(CartContext)
  const [isVisible, setIsVisible] = useState(true)

  const isHome = pathname === "/"

  useEffect(() => {
    let lastScrollY = window.scrollY

    function handleScroll() {
      const currentScrollY = window.scrollY

      if (currentScrollY < 24) {
        setIsVisible(true)
      } else if (currentScrollY > lastScrollY) {
        setIsVisible(false)
      } else {
        setIsVisible(true)
      }

      lastScrollY = currentScrollY
    }

    window.addEventListener("scroll", handleScroll, { passive: true })

    return () => {
      window.removeEventListener("scroll", handleScroll)
    }
  }, [])

  return (
    <>
      <nav
        className={`fixed left-0 top-0 z-40 w-full px-5 py-4 transition-transform duration-300 sm:px-8 lg:px-12 xl:px-16 ${
          isVisible ? "translate-y-0" : "-translate-y-full"
        }`}
      >
        <div
          className={`mx-auto flex max-w-[1440px] items-center justify-between rounded-full border px-4 py-3 text-white backdrop-blur-xl sm:px-6 ${
            isHome
              ? "border-white/10 bg-black/25"
              : "border-white/10 bg-black/70 shadow-[0_18px_60px_rgba(0,0,0,0.35)]"
          }`}
        >
          <Link to="/" className="flex min-w-0 items-center gap-3 sm:gap-4">
            <div className="h-10 w-10 shrink-0 overflow-visible sm:h-12 sm:w-12">
              <img
                src={logo}
                alt="Brian O Closet"
                className="h-full w-full scale-[1.55] object-contain sm:scale-[1.6]"
              />
            </div>
            <div className="min-w-0">
              <p className="truncate text-[11px] uppercase tracking-[0.42em] text-[#d6b37b]">
                Brian O Closet
              </p>
              <p className="hidden text-xs tracking-[0.25em] text-white/60 sm:block">
                Motorsports luxury streetwear
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.28em] sm:gap-3">
            <Link
              to="/"
              className={`soft-button hidden sm:inline-flex ${
                pathname === "/" ? "!border-white/60 !text-white" : ""
              }`}
            >
              Home
            </Link>
            <Link
              to="/shop"
              className={`soft-button ${pathname.startsWith("/shop") ? "!border-white/60 !text-white" : ""}`}
            >
              Shop
            </Link>
            <button onClick={openCart} className="outline-button px-4 py-3 sm:px-6">
              Cart ({cart.length})
            </button>
          </div>
        </div>
      </nav>

      <CartSidebar isOpen={cartOpen} onClose={closeCart} />
    </>
  )
}

export default Navbar
