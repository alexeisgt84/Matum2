import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { router } from './router'
import { registerChunkPreloadErrorHandler } from './lib/lazyWithRetry'
import './index.css'

registerChunkPreloadErrorHandler()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
    <Toaster position="top-right" />
  </React.StrictMode>,
)

// Register Capacitor PWA elements asynchronously after initial render
setTimeout(() => {
  import('@ionic/pwa-elements/loader')
    .then(({ defineCustomElements }) => defineCustomElements(window))
    .catch(() => {});
}, 1000);
