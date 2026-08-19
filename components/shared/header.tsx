import Link from "next/link";

const primaryNav = [
  { label: "New Arrivals", href: "/shop?filter=new" },
  { label: "Fashion", href: "/category/fashion" },
  { label: "Beauty", href: "/category/beauty" },
  { label: "Tech", href: "/category/tech" },
  { label: "Lifestyle", href: "/category/lifestyle" },
  { label: "Home", href: "/category/home" },
  { label: "Membership", href: "/membership" },
];

/**
 * Site header: structure, semantics and design tokens.
 * Search / wishlist / cart counts wire up to real data as storefront matures.
 */
export function SiteHeader() {
  return (
    <header className="border-b border-neutral-200 bg-ivory">
      <div className="container-content flex h-20 items-center justify-between">
        <Link
          href="/"
          className="font-display text-xl tracking-widest2 uppercase"
          aria-label="LÉVANCE home"
        >
          Lévance
        </Link>

        <nav aria-label="Primary" className="hidden lg:flex items-center gap-8">
          {primaryNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm text-neutral-700 hover:text-obsidian transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-5 text-sm">
          <Link href="/shop" aria-label="Search" className="hover:text-champagne-line">
            Search
          </Link>
          <Link href="/account/wishlist" aria-label="Wishlist" className="hover:text-champagne-line">
            Wishlist
          </Link>
          <Link href="/account" aria-label="Account" className="hover:text-champagne-line">
            Account
          </Link>
          <Link href="/cart" aria-label="Cart" className="hover:text-champagne-line">
            Cart
          </Link>
        </div>
      </div>
    </header>
  );
}
