import { useEffect, useMemo, useState } from "react"

import {
  createAdminProduct,
  deleteAdminOrder,
  deleteAdminProduct,
  fetchAdminOrders,
  fetchAdminProducts,
  fetchAdminSession,
  getAdminToken,
  loginAdmin,
  logoutAdmin,
  updateAdminOrder,
  updateAdminProduct
} from "../services/admin"
import { useCatalog } from "../context/CatalogContext"
import categoriesList from "../data/categories"
import { productRequiresSize } from "../utils/productOptions"
import { formatPrice } from "../utils/formatPrice"

const initialLogin = {
  username: "",
  password: ""
}

const initialProductForm = {
  name: "",
  brand: "",
  category: "",
  price: "",
  image: "",
  imagesText: "",
  description: "",
  stock: "",
  isActive: true
}

function Admin() {
  const { refreshProducts } = useCatalog()
  const [token, setToken] = useState(() => getAdminToken())
  const [activeTab, setActiveTab] = useState("products")
  const [products, setProducts] = useState([])
  const [orders, setOrders] = useState([])
  const [loginForm, setLoginForm] = useState(initialLogin)
  const [productForm, setProductForm] = useState(initialProductForm)
  const [editingProductId, setEditingProductId] = useState(null)
  const [loginError, setLoginError] = useState("")
  const [panelMessage, setPanelMessage] = useState("")
  const [loading, setLoading] = useState(false)

  const paidOrders = useMemo(
    () => orders.filter((order) => order.paymentStatus === "paid").length,
    [orders]
  )
  const pendingOrders = useMemo(
    () => orders.filter((order) => order.paymentStatus !== "paid").length,
    [orders]
  )
  const sortedOrders = useMemo(
    () =>
      [...orders].sort(
        (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
      ),
    [orders]
  )

  useEffect(() => {
    if (!token) {
      return
    }

    validateSessionAndLoad()
  }, [token])

  async function validateSessionAndLoad() {
    try {
      await fetchAdminSession()
      await loadAdminData()
    } catch (error) {
      setToken(null)
      setProducts([])
      setOrders([])
      setPanelMessage("")
      setLoginError(error.message)
    }
  }

  async function loadAdminData() {
    setLoading(true)

    try {
      const [{ products: nextProducts }, { orders: nextOrders }] = await Promise.all([
        fetchAdminProducts(),
        fetchAdminOrders()
      ])

      setProducts(nextProducts)
      setOrders(nextOrders)
      setPanelMessage("")
    } catch (error) {
      setPanelMessage(error.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleLogin(event) {
    event.preventDefault()
    setLoginError("")

    try {
      await loginAdmin(loginForm)
      setToken("true")
      setLoginForm(initialLogin)
    } catch (error) {
      setLoginError(error.message)
    }
  }

  async function handleLogout() {
    await logoutAdmin()
    setToken(null)
    setProducts([])
    setOrders([])
    setEditingProductId(null)
    setPanelMessage("")
  }

  function startEditProduct(product) {
    setEditingProductId(product.id)
    setProductForm({
      name: product.name,
      brand: product.brand,
      category: product.category,
      price: String(product.price),
      image: product.image,
      imagesText: (product.images || [product.image]).filter(Boolean).join("\n"),
      description: product.description,
      stock: String(product.stock),
      isActive: product.isActive
    })
    setActiveTab("editor")
    setPanelMessage("")
  }

  async function handleProductSubmit(event) {
    event.preventDefault()
    setPanelMessage("")

    const payload = {
      ...productForm,
      price: Number(productForm.price),
      stock: Number(productForm.stock)
    }

    try {
      if (editingProductId) {
        const { product } = await updateAdminProduct(editingProductId, payload)
        setProducts((prev) =>
          prev.map((item) => (item.id === product.id ? product : item))
        )
        await refreshProducts()
        setPanelMessage("Product updated.")
      } else {
        const { product } = await createAdminProduct(payload)
        setProducts((prev) => [product, ...prev])
        await refreshProducts()
        setPanelMessage("Product created.")
      }

      setProductForm(initialProductForm)
      setEditingProductId(null)
      setActiveTab("products")
    } catch (error) {
      setPanelMessage(error.message)
    }
  }

  async function handleOrderStatusChange(orderId, orderStatus) {
    try {
      const { order } = await updateAdminOrder(orderId, { orderStatus })
      setOrders((prev) => prev.map((item) => (item.id === order.id ? order : item)))
      setPanelMessage(`Order #${order.id} updated.`)
    } catch (error) {
      setPanelMessage(error.message)
    }
  }

  async function handleDeleteOrder(orderId) {
    const confirmed = window.confirm(
      "Delete this order? If it was paid, its items will be added back to stock."
    )

    if (!confirmed) {
      return
    }

    try {
      await deleteAdminOrder(orderId)
      setOrders((prev) => prev.filter((item) => item.id !== orderId))
      await loadAdminData()
      await refreshProducts()
      setPanelMessage(`Order #${orderId} deleted.`)
    } catch (error) {
      setPanelMessage(error.message)
    }
  }

  async function handleDeleteProduct() {
    if (!editingProductId) {
      return
    }

    const confirmed = window.confirm(
      "Delete this product? This cannot be undone."
    )

    if (!confirmed) {
      return
    }

    try {
      await deleteAdminProduct(editingProductId)
      setProducts((prev) => prev.filter((item) => item.id !== editingProductId))
      await refreshProducts()
      setEditingProductId(null)
      setProductForm(initialProductForm)
      setActiveTab("products")
      setPanelMessage("Product deleted.")
    } catch (error) {
      setPanelMessage(error.message)
    }
  }

  if (!token) {
    return (
      <div className="page-shell">
        <div className="mx-auto max-w-xl glass-panel rounded-[34px] p-8 sm:p-10">
          <p className="section-label">Admin access</p>
          <h1 className="editorial-title">Sign in to manage products and orders.</h1>

          <form className="mt-8 space-y-4" onSubmit={handleLogin}>
            <input
              value={loginForm.username}
              onChange={(event) =>
                setLoginForm((prev) => ({ ...prev, username: event.target.value }))
              }
              placeholder="Admin username"
              className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white placeholder:text-white/30"
            />
            <input
              type="password"
              value={loginForm.password}
              onChange={(event) =>
                setLoginForm((prev) => ({ ...prev, password: event.target.value }))
              }
              placeholder="Admin password"
              className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white placeholder:text-white/30"
            />

            {loginError && <p className="text-sm text-red-300">{loginError}</p>}

            <button type="submit" className="outline-button w-full sm:w-auto">
              Sign In
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="page-shell">
      <div className="mb-10 flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="section-label">Admin studio</p>
          <h1 className="hero-title !text-4xl sm:!text-5xl">Run the store from one place.</h1>
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
          <div className="glass-panel rounded-[24px] p-4">
            <p className="text-xs uppercase tracking-[0.3em] text-white/45">Products</p>
            <p className="mt-3 text-2xl text-white">{products.length}</p>
          </div>
          <div className="glass-panel rounded-[24px] p-4">
            <p className="text-xs uppercase tracking-[0.3em] text-white/45">Orders</p>
            <p className="mt-3 text-2xl text-white">{orders.length}</p>
          </div>
          <div className="glass-panel rounded-[24px] p-4">
            <p className="text-xs uppercase tracking-[0.3em] text-white/45">Paid</p>
            <p className="mt-3 text-2xl text-white">{paidOrders}</p>
          </div>
          <div className="glass-panel rounded-[24px] p-4">
            <p className="text-xs uppercase tracking-[0.3em] text-white/45">Pending</p>
            <p className="mt-3 text-2xl text-white">{pendingOrders}</p>
          </div>
          <button onClick={handleLogout} className="soft-button rounded-[24px] px-4 py-4">
            Logout
          </button>
        </div>
      </div>

      <div className="mb-8 flex flex-wrap gap-3">
        <button
          onClick={() => setActiveTab("products")}
          className={`soft-button rounded-full px-5 py-3 ${
            activeTab === "products" ? "!border-[#d6b37b] !text-white" : ""
          }`}
        >
          Products
        </button>
        <button
          onClick={() => setActiveTab("editor")}
          className={`soft-button rounded-full px-5 py-3 ${
            activeTab === "editor" ? "!border-[#d6b37b] !text-white" : ""
          }`}
        >
          {editingProductId ? "Edit Product" : "Add Product"}
        </button>
        <button
          onClick={() => setActiveTab("orders")}
          className={`soft-button rounded-full px-5 py-3 ${
            activeTab === "orders" ? "!border-[#d6b37b] !text-white" : ""
          }`}
        >
          Orders
        </button>
      </div>

      {panelMessage && (
        <div className="mb-6 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-stone-200">
          {panelMessage}
        </div>
      )}

      {loading && <p className="mb-6 text-sm text-stone-400">Loading admin data...</p>}

      {activeTab === "products" && (
        <section className="grid gap-5">
          {products.map((product) => (
            <article
              key={product.id}
              className="glass-panel grid gap-5 rounded-[28px] p-5 sm:grid-cols-[110px_minmax(0,1fr)_auto]"
            >
              <img
                src={product.image}
                alt={product.name}
                className="h-[110px] w-[110px] rounded-[22px] object-cover"
              />

              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-[#d6b37b]">
                  {product.brand}
                </p>
                <h2 className="mt-2 font-serif text-3xl text-white">{product.name}</h2>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-stone-300">
                  {product.description}
                </p>
                <div className="mt-4 flex flex-wrap gap-4 text-xs uppercase tracking-[0.28em] text-white/50">
                  <span>{product.category}</span>
                  <span>Stock {product.stock}</span>
                  <span>{product.isActive ? "Active" : "Hidden"}</span>
                </div>
              </div>

              <div className="flex flex-col items-start gap-3 sm:items-end">
                <p className="text-sm uppercase tracking-[0.28em] text-white">
                  {formatPrice(product.price)}
                </p>
                <button onClick={() => startEditProduct(product)} className="outline-button">
                  Edit
                </button>
              </div>
            </article>
          ))}
        </section>
      )}

      {activeTab === "editor" && (
        <section className="glass-panel max-w-4xl rounded-[30px] p-6 sm:p-8">
          <p className="section-label">{editingProductId ? "Update product" : "New product"}</p>

          <form className="grid gap-4 md:grid-cols-2" onSubmit={handleProductSubmit}>
            <input
              value={productForm.name}
              onChange={(event) =>
                setProductForm((prev) => ({ ...prev, name: event.target.value }))
              }
              placeholder="Product name"
              className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white placeholder:text-white/30 md:col-span-2"
            />
            <input
              value={productForm.brand}
              onChange={(event) =>
                setProductForm((prev) => ({ ...prev, brand: event.target.value }))
              }
              placeholder="Brand"
              className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white placeholder:text-white/30"
            />
            <div>
              <input
                list="product-categories"
                value={productForm.category}
                onChange={(event) =>
                  setProductForm((prev) => ({ ...prev, category: event.target.value }))
                }
                placeholder="Category"
                className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white placeholder:text-white/30"
              />
              <datalist id="product-categories">
                {categoriesList.map((category) => (
                  <option key={category} value={category} />
                ))}
              </datalist>
            </div>
            <input
              value={productForm.price}
              onChange={(event) =>
                setProductForm((prev) => ({ ...prev, price: event.target.value }))
              }
              placeholder="Price"
              className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white placeholder:text-white/30"
            />
            <input
              value={productForm.stock}
              onChange={(event) =>
                setProductForm((prev) => ({ ...prev, stock: event.target.value }))
              }
              placeholder="Stock"
              className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white placeholder:text-white/30"
            />
            <input
              value={productForm.image}
              onChange={(event) =>
                setProductForm((prev) => ({ ...prev, image: event.target.value }))
              }
              placeholder="Primary Image URL"
              className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white placeholder:text-white/30 md:col-span-2"
            />
            <textarea
              value={productForm.imagesText}
              onChange={(event) =>
                setProductForm((prev) => ({ ...prev, imagesText: event.target.value }))
              }
              placeholder="Additional image URLs, one per line"
              rows={4}
              className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white placeholder:text-white/30 md:col-span-2"
            />
            <textarea
              value={productForm.description}
              onChange={(event) =>
                setProductForm((prev) => ({ ...prev, description: event.target.value }))
              }
              placeholder="Description"
              rows={5}
              className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white placeholder:text-white/30 md:col-span-2"
            />
            <label className="flex items-center gap-3 text-sm text-stone-300 md:col-span-2">
              <input
                type="checkbox"
                checked={productForm.isActive}
                onChange={(event) =>
                  setProductForm((prev) => ({ ...prev, isActive: event.target.checked }))
                }
              />
              Visible in storefront
            </label>

            <div className="flex flex-wrap gap-3 md:col-span-2">
              <button type="submit" className="outline-button">
                {editingProductId ? "Save Changes" : "Create Product"}
              </button>
              {editingProductId && (
                <button
                  type="button"
                  onClick={handleDeleteProduct}
                  className="rounded-full border border-red-400/30 px-5 py-3 text-xs uppercase tracking-[0.28em] text-red-200 transition hover:border-red-300 hover:bg-red-400/10"
                >
                  Delete Product
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setEditingProductId(null)
                  setProductForm(initialProductForm)
                }}
                className="soft-button"
              >
                Reset
              </button>
            </div>
          </form>
        </section>
      )}

      {activeTab === "orders" && (
        <section className="grid gap-5">
          {sortedOrders.length === 0 && (
            <div className="glass-panel rounded-[28px] p-8 text-center text-stone-300">
              No orders yet. Run a checkout test and the orders will appear here.
            </div>
          )}

          {sortedOrders.map((order) => (
            <article key={order.id} className="glass-panel rounded-[28px] p-5 sm:p-6">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.35em] text-[#d6b37b]">
                    {order.merchantOrderId}
                  </p>
                  <h2 className="mt-2 font-serif text-3xl text-white">
                    {order.customerName}
                  </h2>
                  <p className="mt-2 text-sm text-stone-300">{order.customerEmail}</p>
                  <p className="mt-1 text-sm text-stone-300">{order.customerPhone}</p>
                  <p className="mt-4 max-w-xl text-sm leading-7 text-stone-400">
                    {order.shippingAddressLine1}
                    {order.shippingAddressLine2 ? `, ${order.shippingAddressLine2}` : ""}
                    {`, ${order.shippingCity}, ${order.shippingState} ${order.shippingPostalCode}`}
                  </p>
                  <p className="mt-3 text-xs uppercase tracking-[0.28em] text-white/35">
                    Created {new Date(order.createdAt).toLocaleString()}
                  </p>
                </div>

                <div className="flex flex-col gap-3">
                  <div className="flex flex-wrap gap-3 text-xs uppercase tracking-[0.28em]">
                    <span className="rounded-full border border-white/10 px-3 py-2 text-white/60">
                      Payment {order.paymentStatus}
                    </span>
                    <span className="rounded-full border border-white/10 px-3 py-2 text-white/60">
                      Order {order.orderStatus}
                    </span>
                    <span className="rounded-full border border-white/10 px-3 py-2 text-white/60">
                      {formatPrice(order.total)}
                    </span>
                  </div>

                  <select
                    value={order.orderStatus}
                    onChange={(event) =>
                      handleOrderStatusChange(order.id, event.target.value)
                    }
                    className="rounded-full border border-white/10 bg-black/40 px-4 py-3 text-sm text-white"
                  >
                    <option value="pending_payment">pending_payment</option>
                    <option value="paid">paid</option>
                    <option value="packed">packed</option>
                    <option value="shipped">shipped</option>
                    <option value="delivered">delivered</option>
                    <option value="cancelled">cancelled</option>
                  </select>

                  <button
                    type="button"
                    onClick={() => handleDeleteOrder(order.id)}
                    className="rounded-full border border-red-400/30 px-4 py-3 text-xs uppercase tracking-[0.28em] text-red-200 transition hover:border-red-300 hover:bg-red-400/10"
                  >
                    Delete Order
                  </button>
                </div>
              </div>

              <div className="mt-6 grid gap-3 border-t border-white/10 pt-5">
                {order.items.map((item, index) => (
                  <div
                    key={`${order.id}-${item.productId}-${index}`}
                    className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm"
                  >
                    <div>
                      <p className="text-white">{item.name}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.28em] text-white/45">
                        {productRequiresSize(item) ? `Size ${item.size}` : "Collectible"}
                      </p>
                    </div>
                    <p className="text-white/70">
                      {item.quantity} x {formatPrice(item.price)}
                    </p>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </section>
      )}
    </div>
  )
}

export default Admin
