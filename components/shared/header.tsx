import Link from "next/link";
import { Emblem } from "@/components/shared/emblem";
import { getCurrentUser } from "@/lib/auth/session";

const primaryNav = [
  { label: "New Arrivals", href: "/shop?filter=new" },
  { label: "Fashion", href: "/category/fashion" },
  { label: "Beauty", href: "/category/beauty" },
  { label: "Tech", href: "/category/tech" },
  { label: "Lifestyle", href: "/category/lifestyle" },
  { label: "Home", href: "/category/home" },
  { label: "Membership", href: "/membership" },
];

export async function SiteHeader() {
  const user = await getCurrentUser();
  const initial = user?.email?.slice(0, 1).toUpperCase() ?? null;

  return (
    <header className="border-b border-neutral-200 bg-ivory">
      <div className="container-content flex h-20 items-center justify-between">
        <Link href="/" className="flex items-center gap-3" aria-label="LÉVANCE home">
          <Emblem variant="static" />
          <span className="font-display text-xl tracking-widest2 uppercase">Lévance</span>
        </Link>
        <nav aria-label="Primary" className="hidden items-center gap-8 lg:flex">
          {primaryNav.map((item) => <Link key={item.href} href={item.href} className="text-sm text-neutral-700 transition-colors hover:text-obsidian">{item.label}</Link>)}
        </nav>
        <div className="flex items-center gap-5 text-sm">
          <Link href="/shop" aria-label="Search" className="hover:text-champagne-line">Search</Link>
          <Link href="/account/wishlist" aria-label="Wishlist" className="hover:text-champagne-line">Wishlist</Link>
          {user ? (
            <Link href="/account" aria-label="Account" className="flex items-center gap-2 hover:text-champagne-line">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-obsidian text-xs text-ivory" aria-hidden="true">{initial}</span>
              <span>Account</span>
            </Link>
          ) : (
            <Link href="/login" aria-label="Sign in" className="hover:text-champagne-line">Sign in</Link>
          )}
          <Link href="/cart" aria-label="Cart" className="hover:text-champagne-line">Cart</Link>
        </div>
      </div>
    </header>
  );
}
