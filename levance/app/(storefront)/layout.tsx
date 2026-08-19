import { SiteHeader } from "@/components/shared/header";
import { SiteFooter } from "@/components/shared/footer";

export default function StorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <SiteHeader />
      <main>{children}</main>
      <SiteFooter />
    </>
  );
}
