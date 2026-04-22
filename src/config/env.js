export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ""

export const RAZORPAY_ENABLED =
  import.meta.env.VITE_RAZORPAY_ENABLED === "true"

export function buildApiUrl(pathname) {
  return API_BASE_URL ? `${API_BASE_URL}${pathname}` : pathname
}
