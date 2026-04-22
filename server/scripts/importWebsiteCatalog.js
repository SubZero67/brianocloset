import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
  writeFileSync
} from "node:fs"
import path from "node:path"
import { DatabaseSync } from "node:sqlite"

const sourceRoot = process.argv[2]
const workspaceRoot = path.resolve(".")
const publicRoot = path.join(workspaceRoot, "public", "catalog")
const productsJsonPath = path.join(workspaceRoot, "server", "data", "products.json")
const databasePath = path.join(workspaceRoot, "server", "data", "store.db")

if (!sourceRoot) {
  throw new Error("Usage: node server/scripts/importWebsiteCatalog.js <source-folder>")
}

const folderBrandMap = {
  BMW: "BMW",
  "couple set hoodies": "Couple Set Hoodies",
  "Fast & Furious": "Fast & Furious",
  Ferrari: "Ferrari",
  lambo: "Lambo",
  Porsche: "Porsche",
  "The OG_s": "The OG's",
  toys: "Toys"
}

const tokenBrandMap = {
  bmw: "BMW",
  ferrari: "Ferrari",
  lambo: "Lamborghini",
  lamborghini: "Lamborghini",
  porsche: "Porsche",
  nissan: "Nissan",
  gtr: "Nissan",
  supra: "Toyota",
  defender: "Land Rover",
  "land rover": "Land Rover",
  shelby: "Shelby"
}

const curatedNames = {
  "BMW|Hoodie|1": "Ashbourne Crest Hoodie",
  "BMW|Polo T-shirt|1": "Belgrave Polo T-shirt",
  "BMW|T-shirts|1": "Marlowe T-shirt",
  "BMW|T-shirts|2": "Westbury T-shirt",
  "Couple Set Hoodies|Couple hoodies|1": "Hawthorne Pair Hoodie",
  "Couple Set Hoodies|Couple hoodies|2": "Sterling Match Hoodie",
  "Couple Set Hoodies|Couple hoodies|3": "Regency Couple Hoodie",
  "Couple Set Hoodies|Couple hoodies|4": "Langford Duet Hoodie",
  "Fast & Furious|Hoodie|1": "Monterey GTR Hoodie",
  "Fast & Furious|Polo T-shirt|1": "Monaco GTR Polo T-shirt",
  "Fast & Furious|Polo T-shirt|2": "Sovereign Supra Polo T-shirt",
  "Fast & Furious|T-shirts|1": "Cavendish GTR T-shirt",
  "Fast & Furious|T-shirts|2": "Sovereign Supra T-shirt",
  "Ferrari|Hoodie|1": "Rosso Manor Hoodie",
  "Ferrari|Polo T-shirt|1": "Portofino Polo T-shirt",
  "Ferrari|Polo T-shirt|2": "Maranello Polo T-shirt",
  "Ferrari|T-shirts|1": "Valentino T-shirt",
  "Ferrari|T-shirts|2": "Scuderia House T-shirt",
  "Lambo|Hoodie|1": "Savile Bull Hoodie",
  "Lambo|Polo T-shirt|1": "Aurelio Polo T-shirt",
  "Lambo|Polo T-shirt|2": "Milano Polo T-shirt",
  "Lambo|T-shirts|1": "Torino T-shirt",
  "Lambo|T-shirts|2": "Cortina T-shirt",
  "Porsche|Hoodie|1": "Stuttgart Club Hoodie",
  "Porsche|Polo T-shirt|1": "Baden Polo T-shirt",
  "Porsche|Polo T-shirt|2": "Zuffenhausen Polo T-shirt",
  "Porsche|T-shirts|1": "Briarwood T-shirt",
  "Porsche|T-shirts|2": "Kingsley T-shirt",
  "The OG's|Hoodie|1": "Shelby Estate Hoodie",
  "The OG's|Polo T-shirt|1": "Defender House Polo T-shirt",
  "The OG's|T-shirts|1": "Defender Heritage T-shirt",
  "The OG's|T-shirts|2": "Shelby Club T-shirt",
  "Toys|Toys (cars)|1": "Mayfair Collector Car",
  "Toys|Toys (cars)|2": "Kensington Collector Car",
  "Toys|Toys (cars)|3": "Grosvenor Collector Car",
  "Toys|Toys (cars)|4": "Windsor Collector Car",
  "Toys|Toys (cars)|5": "Richmond Collector Car",
  "Toys|Toys (cars)|6": "Ascot Collector Car",
  "Toys|Toys (cars)|7": "Belmont Collector Car",
  "Toys|Toys (cars)|8": "Fairmont Collector Car",
  "Toys|Toys (cars)|9": "Arlington Collector Car"
}

const curatedStemNames = {
  "Couple Set Hoodies|Couple hoodies|couple-hoodie-1": "Couple Set Hoodies Hawthorne Pair Hoodie",
  "Couple Set Hoodies|Couple hoodies|couple-hoodie-2": "Couple Set Hoodies Sterling Match Hoodie",
  "Couple Set Hoodies|Couple hoodies|matching-couple-hoodie-1": "Couple Set Hoodies Regency Couple Hoodie",
  "Couple Set Hoodies|Couple hoodies|matching-couple-hoodie-2": "Couple Set Hoodies Langford Duet Hoodie"
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

function titleCase(value) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ")
}

function collectFiles(root) {
  const results = []

  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const fullPath = path.join(root, entry.name)

    if (entry.isDirectory()) {
      results.push(...collectFiles(fullPath))
      continue
    }

    results.push(fullPath)
  }

  return results
}

function parseCategory(fileName, folderName) {
  const value = `${folderName} ${fileName}`.toLowerCase()

  if (folderName.toLowerCase() === "couple set hoodies") {
    return "Couple hoodies"
  }

  if (folderName.toLowerCase() === "toys" || value.includes("toy")) {
    return "Toys (cars)"
  }

  if (value.includes("polo")) {
    return "Polo T-shirt"
  }

  if (value.includes("tee")) {
    return "T-shirts"
  }

  return "Hoodie"
}

function parseSequence(fileName) {
  const numberMatches = [...fileName.matchAll(/\b(\d+)\b/g)].map((match) => Number(match[1]))

  if (numberMatches.length === 0) {
    return 1
  }

  if (fileName.toLowerCase().includes("img") && numberMatches.length > 1) {
    return numberMatches[0]
  }

  return numberMatches[0]
}

function parseImageOrder(fileName) {
  const imgMatch = fileName.match(/img\s*(\d+)/i)

  if (imgMatch) {
    return Number(imgMatch[1])
  }

  return 1
}

function inferBrand(folderName, fileName) {
  if (folderBrandMap[folderName]) {
    return folderBrandMap[folderName]
  }

  const normalized = fileName.toLowerCase()

  for (const [token, brand] of Object.entries(tokenBrandMap)) {
    if (normalized.includes(token)) {
      return brand
    }
  }

  return folderBrandMap[folderName] || titleCase(folderName.replace(/[_-]+/g, " "))
}

function buildProductStem(fileName, folderName) {
  let stem = fileName.replace(path.extname(fileName), "")

  stem = stem
    .replace(/img\s*\d+/gi, "")
    .replace(/\s+/g, " ")
    .trim()

  if (!stem) {
    stem = folderName
  }

  return stem
}

function buildName(brand, category, stem) {
  const cleanedStem = stem
    .replace(/\btee\b/gi, "")
    .replace(/\bpolo\b/gi, "")
    .replace(/\bhoodie\b/gi, "")
    .replace(/\btoy\b/gi, "")
    .replace(/\s+/g, " ")
    .trim()

  let prefix = cleanedStem ? titleCase(cleanedStem) : brand

  if (/^\d+$/.test(prefix)) {
    prefix = `${brand} Series ${prefix}`
  }

  if (category === "Toys (cars)") {
    return `${brand} ${prefix} Collector Car`
  }

  if (category === "Polo T-shirt") {
    return `${brand} ${prefix} Polo T-shirt`
  }

  if (category === "T-shirts") {
    return `${brand} ${prefix} T-shirt`
  }

  return `${brand} ${prefix} Hoodie`
}

function buildDescription(brand, category, name) {
  if (category === "Couple hoodies") {
    return `${name} is a coordinated matching hoodie set with a tailored luxury-streetwear feel, elevated fabric presence, and a refined couples styling mood.`
  }

  if (category === "Toys (cars)") {
    return `${name} is a display-ready collectible with a premium finish, clean automotive styling, and an easy shelf presence for enthusiasts and gift buyers alike.`
  }

  if (category === "Polo T-shirt") {
    return `${name} is a polished ${brand} polo with a smarter street-luxe profile, soft structure, and an understated motorsport edge.`
  }

  if (category === "T-shirts") {
    return `${name} is a premium ${brand} tee with a clean silhouette, refined graphic presence, and an everyday luxury streetwear feel.`
  }

  return `${name} is a premium ${brand} hoodie with a confident oversized feel, elevated detailing, and a motorsport-inspired luxury finish.`
}

function ensureBrandInName(brand, name) {
  if (name.toLowerCase().startsWith(brand.toLowerCase())) {
    return name
  }

  return `${brand} ${name}`
}

function placeholderPrice(category) {
  if (category === "Toys (cars)") {
    return 2499
  }

  if (category === "Polo T-shirt") {
    return 3999
  }

  if (category === "T-shirts") {
    return 3299
  }

  return 6499
}

function stockForCategory(category) {
  return category === "Toys (cars)" ? 18 : 25
}

function insertProduct(statement, product) {
  statement.run(
    product.id,
    product.name,
    product.price,
    product.brand,
    product.category,
    product.image,
    JSON.stringify(product.images),
    product.description,
    product.stock,
    product.isActive ? 1 : 0
  )
}

if (existsSync(publicRoot)) {
  rmSync(publicRoot, { recursive: true, force: true })
}

mkdirSync(publicRoot, { recursive: true })

const grouped = new Map()

for (const filePath of collectFiles(sourceRoot)) {
  const folderName = path.basename(path.dirname(filePath))
  const fileName = path.basename(filePath)
  const category = parseCategory(fileName, folderName)
  const imageOrder = parseImageOrder(fileName)
  const stem = buildProductStem(fileName, folderName)
  const brand = inferBrand(folderName, fileName)
  const sequence = parseSequence(stem)
  const key = `${folderName}::${category}::${slugify(stem)}`
  const current = grouped.get(key) || {
    folderName,
    category,
    sequence,
    brand,
    stem,
    files: []
  }

  current.files.push({
    filePath,
    imageOrder
  })

  grouped.set(key, current)
}

const rawProducts = [...grouped.values()]
  .sort((left, right) => {
    if (left.folderName !== right.folderName) {
      return left.folderName.localeCompare(right.folderName)
    }

    if (left.category !== right.category) {
      return left.category.localeCompare(right.category)
    }

    return left.sequence - right.sequence
  })
  .map((entry) => {
    const baseName =
      curatedStemNames[`${entry.brand}|${entry.category}|${slugify(entry.stem)}`] ||
      curatedNames[`${entry.brand}|${entry.category}|${entry.sequence}`] ||
      buildName(entry.brand, entry.category, entry.stem)

    const name = ensureBrandInName(entry.brand, baseName)
    return {
      ...entry,
      name
    }
  })

const nameCounts = new Map()

const products = rawProducts.map((entry, index) => {
    const occurrence = (nameCounts.get(entry.name) || 0) + 1
    nameCounts.set(entry.name, occurrence)

    const uniqueName = occurrence === 1 ? entry.name : `${entry.name} ${occurrence}`
    const productSlug = slugify(uniqueName)
    const targetDir = path.join(publicRoot, slugify(entry.brand), productSlug)

    mkdirSync(targetDir, { recursive: true })

    const imageUrls = entry.files
      .sort((left, right) => left.imageOrder - right.imageOrder)
      .map((item, imageIndex) => {
        const ext = path.extname(item.filePath).toLowerCase()
        const nextName = `${String(imageIndex + 1).padStart(2, "0")}${ext}`
        copyFileSync(item.filePath, path.join(targetDir, nextName))
        return `/catalog/${slugify(entry.brand)}/${productSlug}/${nextName}`
      })

    return {
      id: index + 1,
      name: uniqueName,
      price: placeholderPrice(entry.category),
      brand: entry.brand,
      category: entry.category,
      image: imageUrls[0],
      images: imageUrls,
      description: buildDescription(entry.brand, entry.category, uniqueName),
      stock: stockForCategory(entry.category),
      isActive: true
    }
  })

writeFileSync(productsJsonPath, `${JSON.stringify(products, null, 2)}\n`)

const database = new DatabaseSync(databasePath)
database.exec("BEGIN")

try {
  database.exec("DELETE FROM products")

  const statement = database.prepare(`
    INSERT INTO products (
      id,
      name,
      price,
      brand,
      category,
      image,
      images_json,
      description,
      stock,
      is_active
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  for (const product of products) {
    insertProduct(statement, product)
  }

  database.exec("COMMIT")
} catch (error) {
  database.exec("ROLLBACK")
  throw error
} finally {
  database.close()
}

console.log(`Imported ${products.length} products from ${sourceRoot}`)
