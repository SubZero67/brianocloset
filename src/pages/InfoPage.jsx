import { Link, useLocation } from "react-router-dom"

const pages = {
  "/contact": {
    label: "Support",
    title: "Contact Brian O Closet",
    intro:
      "For order questions, payment help, size support, or product availability, contact the store team.",
    sections: [
      {
        heading: "Customer support",
        body: [
          "Email: brian.o.closet@gmail.com",
          "Support hours: Monday to Saturday, 10:00 AM to 7:00 PM IST",
          "Please include your order reference if your message is about an existing order."
        ]
      },
      {
        heading: "Business location",
        body: [
          "Brian O Closet operates from India.",
          "A full shipping address is collected during checkout for order fulfillment."
        ]
      }
    ]
  },
  "/shipping": {
    label: "Delivery",
    title: "Shipping & Delivery",
    intro:
      "Orders are packed with care and shipped to the delivery address provided during checkout.",
    sections: [
      {
        heading: "Processing time",
        body: [
          "Most orders are prepared after payment confirmation.",
          "Processing timelines can vary during drops, restocks, and high-demand periods."
        ]
      },
      {
        heading: "Delivery fee",
        body: [
          "A delivery charge may be shown at checkout before payment.",
          "The final amount paid through Razorpay includes the product subtotal and any listed delivery charge."
        ]
      },
      {
        heading: "Delivery support",
        body: [
          "For delivery questions, email brian.o.closet@gmail.com with your order reference."
        ]
      }
    ]
  },
  "/returns": {
    label: "After-sales",
    title: "Returns & Refunds",
    intro:
      "If something is wrong with your order, contact support quickly so the issue can be reviewed.",
    sections: [
      {
        heading: "Return requests",
        body: [
          "Return or replacement requests should be raised within 48 hours of delivery.",
          "Items must be unused, unwashed, and returned with original packaging where applicable."
        ]
      },
      {
        heading: "Refunds",
        body: [
          "Approved refunds are processed back to the original payment method through Razorpay or the payment provider.",
          "Bank processing timelines may vary after the refund is initiated."
        ]
      },
      {
        heading: "Not eligible",
        body: [
          "Used, damaged-after-delivery, washed, or altered products may not be eligible for return."
        ]
      }
    ]
  },
  "/privacy": {
    label: "Privacy",
    title: "Privacy Policy",
    intro:
      "Brian O Closet collects only the information needed to process orders, provide support, and maintain store operations.",
    sections: [
      {
        heading: "Information collected",
        body: [
          "Name, email, phone number, shipping address, order details, and payment reference details may be stored.",
          "Payment card, UPI, or banking details are handled by Razorpay and are not stored by this website."
        ]
      },
      {
        heading: "How information is used",
        body: [
          "Customer information is used for checkout, delivery, payment verification, support, and order records."
        ]
      },
      {
        heading: "Contact",
        body: [
          "For privacy questions, email brian.o.closet@gmail.com."
        ]
      }
    ]
  },
  "/terms": {
    label: "Terms",
    title: "Terms & Conditions",
    intro:
      "By using this website and placing an order, you agree to the store terms listed here.",
    sections: [
      {
        heading: "Orders",
        body: [
          "Orders are confirmed after successful payment verification.",
          "Brian O Closet may cancel or review orders affected by incorrect details, stock issues, or payment verification failures."
        ]
      },
      {
        heading: "Product details",
        body: [
          "Product images, color, fit, and availability may vary slightly due to display settings, stock updates, and production differences."
        ]
      },
      {
        heading: "Payments",
        body: [
          "Payments are processed through Razorpay.",
          "A payment is treated as complete only after backend verification or payment confirmation from Razorpay."
        ]
      }
    ]
  }
}

function InfoPage() {
  const { pathname } = useLocation()
  const page = pages[pathname] || pages["/contact"]

  return (
    <main className="page-shell">
      <div className="mx-auto max-w-5xl">
        <p className="section-label">{page.label}</p>
        <h1 className="hero-title !text-4xl sm:!text-5xl">{page.title}</h1>
        <p className="mt-6 max-w-3xl text-base leading-8 text-stone-300">{page.intro}</p>

        <div className="mt-12 grid gap-5">
          {page.sections.map((section) => (
            <section key={section.heading} className="surface-card rounded-[28px] p-6 sm:p-8">
              <h2 className="font-serif text-2xl text-white">{section.heading}</h2>
              <div className="mt-5 space-y-3 text-sm leading-7 text-stone-300">
                {section.body.map((item) => (
                  <p key={item}>{item}</p>
                ))}
              </div>
            </section>
          ))}
        </div>

        <Link to="/shop" className="outline-button mt-10">
          Back To Shop
        </Link>
      </div>
    </main>
  )
}

export default InfoPage
