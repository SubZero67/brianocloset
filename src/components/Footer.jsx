import { Link } from "react-router-dom"

const footerLinks = [
  { label: "Contact", to: "/contact" },
  { label: "Shipping", to: "/shipping" },
  { label: "Returns", to: "/returns" },
  { label: "Privacy", to: "/privacy" },
  { label: "Terms", to: "/terms" }
]

function Footer() {
  return (
    <footer className="border-t border-white/10 bg-black px-5 py-10 text-white sm:px-8 lg:px-12 xl:px-16">
      <div className="mx-auto grid max-w-[1440px] gap-8 md:grid-cols-[1.1fr_1fr] md:items-end">
        <div>
          <p className="section-label">Brian O Closet</p>
          <p className="max-w-xl text-sm leading-7 text-stone-300">
            Motorsports-inspired luxury streetwear, collectible drops, and support for
            every order placed through the official store.
          </p>
          <p className="mt-5 text-sm text-stone-400">
            Support:{" "}
            <a className="text-white transition hover:text-[#d6b37b]" href="mailto:brian.o.closet@gmail.com">
              brian.o.closet@gmail.com
            </a>
          </p>
        </div>

        <nav className="flex flex-wrap gap-3 md:justify-end">
          {footerLinks.map((link) => (
            <Link key={link.to} to={link.to} className="soft-button">
              {link.label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="mx-auto mt-8 flex max-w-[1440px] flex-col gap-3 border-t border-white/10 pt-6 text-xs uppercase tracking-[0.28em] text-white/40 sm:flex-row sm:items-center sm:justify-between">
        <p>Copyright {new Date().getFullYear()} Brian O Closet</p>
        <p>
          Created with love by{" "}
          <a className="text-white transition hover:text-[#d6b37b]" href="mailto:tejasachar46@gmail.com">
            Tejas B M
          </a>
          {" "}(
          <a className="text-white transition hover:text-[#d6b37b]" href="mailto:tejasachar46@gmail.com">
            tejasachar46@gmail.com
          </a>
          ) |{" "}
          <a
            className="text-white transition hover:text-[#d6b37b]"
            href="https://github.com/SubZero67"
            rel="noreferrer"
            target="_blank"
          >
            GitHub
          </a>
        </p>
      </div>
    </footer>
  )
}

export default Footer
