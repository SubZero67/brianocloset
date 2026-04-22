import Navbar from "./components/Navbar"
import Home from "./pages/Home"
import Shop from "./pages/Shop"
import Product from "./pages/Product"
import Cart from "./pages/Cart"
import Brand from "./pages/Brand"
import Checkout from "./pages/Checkout"
import CheckoutSetup from "./pages/CheckoutSetup"
import CheckoutSuccess from "./pages/CheckoutSuccess"
import CheckoutCancel from "./pages/CheckoutCancel"
import Admin from "./pages/Admin"

import { BrowserRouter, Routes, Route } from "react-router-dom"

function App() {

  return (

    <BrowserRouter>

      <Navbar />

      <Routes>

        <Route path="/" element={<Home />} />

        <Route path="/shop" element={<Shop />} />

        <Route path="/product/:id" element={<Product />} />

        <Route path="/cart" element={<Cart />} />

        <Route path="/brand/:brandName" element={<Brand />} />

        <Route path="/checkout" element={<Checkout />} />

        <Route path="/checkout/setup" element={<CheckoutSetup />} />

        <Route path="/checkout/success" element={<CheckoutSuccess />} />

        <Route path="/checkout/cancel" element={<CheckoutCancel />} />

        <Route path="/admin" element={<Admin />} />

      </Routes>

    </BrowserRouter>

  )

}

export default App
