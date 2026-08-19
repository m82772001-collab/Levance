import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/shared/header";
import { SiteFooter } from "@/components/shared/footer";
import { getCurrentUser } from "@/lib/auth/session";

/**
 * Server-side gate: every /account/* route requires an authenticated
 * session. This is enforced here (not just hidden in the UI) and again
 * by RLS at the database layer — defense in depth per the security model.
 */
export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?redirectTo=/account");
  }

  return (
    <>
      <SiteHeader />
      <main className="container-content py-12">{children}</main>
      <SiteFooter />
    </>
  );
}
