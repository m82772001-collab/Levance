import Link from "next/link";
import { Emblem } from "@/components/shared/emblem";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-ivory px-6 py-12">
      <div className="mx-auto flex w-full max-w-sm flex-col items-center">
        <Link href="/" aria-label="LÉVANCE home" className="mb-8">
          <Emblem variant="compact" />
        </Link>
        {children}
      </div>
    </div>
  );
}
