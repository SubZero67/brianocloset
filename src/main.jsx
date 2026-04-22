import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

import { CartProvider } from './context/CartContext.jsx'
import { CatalogProvider } from './context/CatalogContext.jsx'

createRoot(document.getElementById('root')).render(

  <StrictMode>

    <CartProvider>

      <CatalogProvider>

        <App />

      </CatalogProvider>

    </CartProvider>

  </StrictMode>

)
