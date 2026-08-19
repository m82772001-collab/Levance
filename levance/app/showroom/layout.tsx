import { requireShowroomAccess } from "@/lib/ai/access";
import Link from "next/link";

export default async function ShowroomLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireShowroomAccess();

  return (
    <div className="min-h-screen bg-ivory">
      <header className="border-b border-neutral-200 bg-obsidian text-ivory">
        <div className="container-content flex h-16 items-center justify-between">
          <Link href="/showroom" className="font-display text-sm tracking-widest2 uppercase">
            Private Showroom
          </Link>
          <nav className="flex items-center gap-6 text-sm text-neutral-300">
            <Link href="/shop" className="hover:text-ivory transition-colors">
              Shop
            </Link>
            <Link href="/account" className="hover:text-ivory transition-colors">
              Account
            </Link>
            <Link href="/account/ai-memory" className="hover:text-ivory transition-colors">
              Memory
            </Link>
          </nav>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
