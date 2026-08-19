import Link from "next/link";
import { requireMonarchAccess } from "@/lib/ai/access";

export default async function MonarchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireMonarchAccess();

  return (
    <div className="min-h-screen bg-obsidian text-ivory">
      <header className="border-b border-white/10">
        <div className="container-content flex h-16 items-center justify-between">
          <Link
            href="/monarch"
            className="font-display text-sm tracking-widest2 uppercase text-champagne"
          >
            Monarch Salon
          </Link>
          <nav className="flex items-center gap-6 text-sm text-neutral-400">
            <Link href="/showroom" className="hover:text-ivory transition-colors">
              Showroom
            </Link>
            <Link href="/account" className="hover:text-ivory transition-colors">
              Account
            </Link>
            <Link href="/account/ai-memory" className="hover:text-ivory transition-colors">
              Archive
            </Link>
          </nav>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
