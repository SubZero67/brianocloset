import { Link } from "react-router-dom"

import heroPoster from "../assets/brand-bg/fnf.jpg"
import logo from "../assets/logo.png"
import video from "../assets/drift.mp4"
import { useCatalog } from "../context/CatalogContext"
import brands from "../data/brands"

function Home() {
  const { products } = useCatalog()
  const originals = brands.find((brand) => brand.name === "The OG's")
  const fnf = brands.find((brand) => brand.name === "Fast & Furious")
  const carBrands = brands.filter(
    (brand) =>
      brand.name !== "The OG's" &&
      brand.name !== "Fast & Furious" &&
      brand.name !== "Couple Set Hoodies" &&
      brand.name !== "Toys"
  )
  const activeProductCount = products.length
  const activeBrandCount = (originals ? 1 : 0) + (fnf ? 1 : 0) + carBrands.length

  return (
    <div className="bg-black text-white">
      <section className="relative min-h-screen overflow-hidden">
        <img
          src={heroPoster}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover md:hidden"
        />
        <video
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          poster={heroPoster}
          className="absolute inset-0 hidden h-full w-full object-cover md:block"
        >
          <source src={video} type="video/mp4" />
        </video>

        <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(4,4,4,0.85),rgba(4,4,4,0.35)_45%,rgba(4,4,4,0.82))]" />

        <div className="page-shell relative z-10 flex min-h-screen items-end pb-14 sm:pb-20">
          <div className="grid w-full gap-10 xl:grid-cols-[minmax(0,1.1fr)_340px] xl:items-end">
            <div className="max-w-4xl">
              <p className="section-label">Built for late-night runs</p>
              <h1 className="hero-title max-w-4xl">
                Streetwear shaped by engines, neon, and after-hours speed.
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-7 text-stone-300 sm:text-lg">
                Brian O Closet blends performance culture with luxury silhouettes,
                turning iconic automotive worlds into collectible drops.
              </p>

              <div className="mt-8 flex flex-wrap gap-4">
                <Link to="/shop" className="outline-button">
                  Explore Collection
                </Link>
                <Link to="/brand/BMW" className="soft-button">
                  Start with BMW
                </Link>
              </div>
            </div>

            <div className="glass-panel rounded-[28px] p-6 sm:p-8">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.35em] text-[#d6b37b]">
                    Current Mood
                  </p>
                  <p className="mt-3 font-serif text-3xl leading-tight text-white">
                    Race garage,
                    <br />
                    elevated.
                  </p>
                </div>

                <img
                  src={logo}
                  alt="Brian O Closet"
                  className="h-20 w-20 object-contain opacity-90 sm:h-24 sm:w-24"
                />
              </div>

              <div className="mt-8 grid grid-cols-2 gap-4 text-sm">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-white/45">Pieces</p>
                  <p className="mt-3 text-2xl text-white">{activeProductCount}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-white/45">Brands</p>
                  <p className="mt-3 text-2xl text-white">{activeBrandCount}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="page-shell pt-16 sm:pt-20">
        <div className="mb-12 max-w-3xl">
          <p className="section-label">Featured collaborations</p>
          <h2 className="editorial-title">
            Capsule collections framed like cinematic scenes instead of plain product grids.
          </h2>
        </div>

        <div className="grid gap-8 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,0.9fr)]">
          {originals && (
            <Link to={`/brand/${originals.name}`} className="group">
              <article className="surface-card relative min-h-[360px] overflow-hidden rounded-[30px]">
                <img
                  src={originals.image}
                  alt={originals.name}
                  className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(5,5,5,0.85),rgba(5,5,5,0.2)_55%,rgba(5,5,5,0.85))]" />
                <div className="relative flex h-full min-h-[360px] flex-col justify-between p-8 sm:p-10">
                  <div>
                    <p className="section-label">Hero capsule</p>
                    <h3 className="font-serif text-4xl sm:text-5xl">The OG&apos;s</h3>
                  </div>

                  <div className="max-w-xl">
                    <img
                      src={originals.collabLogo}
                      alt={`${originals.name} collaboration logo`}
                      className="max-h-[120px] object-contain object-left"
                    />
                    <p className="mt-6 max-w-lg text-sm leading-7 text-stone-300">
                      The core BOC line with a moodier silhouette language, stripped-back
                      graphics, and a cleaner luxury profile.
                    </p>
                  </div>
                </div>
              </article>
            </Link>
          )}

          {fnf && (
            <Link to={`/brand/${fnf.name}`} className="group">
              <article className="surface-card relative min-h-[360px] overflow-hidden rounded-[30px]">
                <img
                  src={fnf.image}
                  alt={fnf.name}
                  className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,5,5,0.35),rgba(5,5,5,0.92))]" />
                <div className="relative flex h-full min-h-[360px] flex-col justify-end p-8">
                  <p className="section-label">Street cinema</p>
                  <img
                    src={fnf.collabLogo}
                    alt={`${fnf.name} collaboration logo`}
                    className="max-h-[120px] object-contain object-left"
                  />
                  <p className="mt-5 max-w-md text-sm leading-7 text-stone-300">
                    Louder graphics, harder contrast, and silhouettes built for the more
                    aggressive side of the label.
                  </p>
                </div>
              </article>
            </Link>
          )}
        </div>

        <div className="mt-16 grid gap-8 md:grid-cols-2">
          {carBrands.map((brand) => (
            <Link key={brand.name} to={`/brand/${brand.name}`} className="group">
              <article className="surface-card relative min-h-[280px] overflow-hidden rounded-[28px]">
                <img
                  src={brand.image}
                  alt={brand.name}
                  className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,5,5,0.15),rgba(5,5,5,0.88))]" />
                <div className="relative flex h-full min-h-[280px] flex-col justify-between p-7 sm:p-8">
                  <p className="text-xs uppercase tracking-[0.35em] text-white/55">
                    {brand.name}
                  </p>

                  <div>
                    <img
                      src={brand.collabLogo}
                      alt={`${brand.name} collaboration logo`}
                      className="max-h-[110px] object-contain object-left"
                    />
                    <p className="mt-5 text-sm leading-7 text-stone-300">
                      A focused drop built around the visual energy of {brand.name}.
                    </p>
                  </div>
                </div>
              </article>
            </Link>
          ))}
        </div>

      </section>
    </div>
  )
}

export default Home
