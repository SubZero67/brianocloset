const sizedCategories = new Set([
  "hoodie",
  "hoodies",
  "couple hoodies",
  "tshirt",
  "t-shirts",
  "tshirts",
  "polo t-shirt",
  "polo t shirts",
  "polo tshirt",
  "polo tshirts",
  "tee",
  "tees",
  "jacket",
  "jackets",
  "pant",
  "pants"
])

export function productRequiresSize(product) {
  const category = String(product?.category || "")
    .trim()
    .toLowerCase()

  return sizedCategories.has(category)
}

export function getVariantLabel(product) {
  return productRequiresSize(product) ? "Size" : "Variant"
}
