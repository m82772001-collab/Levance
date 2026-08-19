import Link from "next/link";
import { requireUser } from "@/lib/auth/rbac";
import { createSupabaseServerClient } from "@/lib/db/supabase-server";
import { formatMoney } from "@/lib/catalog/queries";
import { WishlistRemoveButton } from "@/components/account/wishlist-remove";

export const metadata = { title: "Wishlist" };

export default async function WishlistPage() {
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();

  const { data: wishlist } = await supabase
    .from("wishlists")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  let products: {
    id: string;
    slug: string;
    name: string;
    brand: string | null;
    min_price: number | null;
    image: string | null;
  }[] = [];

  if (wishlist) {
    const { data: items } = await supabase
      .from("wishlist_items")
      .select("product_id, products(id, slug, name, brand, is_active)")
      .eq("wishlist_id", (wishlist as { id: string }).id);

    const rows = (items ?? []) as {
      product_id: string;
      products: {
        id: string;
        slug: string;
        name: string;
        brand: string | null;
        is_active: boolean;
      } | null;
    }[];

    const active = rows.filter((r) => r.products?.is_active);
    const ids = active.map((r) => r.products!.id);

    if (ids.length) {
      const [{ data: variants }, { data: images }] = await Promise.all([
        supabase
          .from("product_variants")
          .select("product_id, price_cents")
          .in("product_id", ids)
          .eq("is_active", true),
        supabase
          .from("product_images")
          .select("product_id, url, sort_order")
          .in("product_id", ids)
          .order("sort_order"),
      ]);

      const priceMap = new Map<string, number>();
      for (const v of variants ?? []) {
        const row = v as { product_id: string; price_cents: number };
        const cur = priceMap.get(row.product_id);
        if (cur == null || row.price_cents < cur) priceMap.set(row.product_id, row.price_cents);
      }
      const imageMap = new Map<string, string>();
      for (const img of images ?? []) {
        const row = img as { product_id: string; url: string };
        if (!imageMap.has(row.product_id)) imageMap.set(row.product_id, row.url);
      }

      products = active.map((r) => ({
        id: r.products!.id,
        slug: r.products!.slug,
        name: r.products!.name,
        brand: r.products!.brand,
        min_price: priceMap.get(r.products!.id) ?? null,
        image: imageMap.get(r.products!.id) ?? null,
      }));
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="eyebrow mb-2">Account</p>
        <h1 className="font-display text-3xl">Wishlist</h1>
      </div>

      {products.length === 0 ? (
        <div className="rounded-lg border border-neutral-200 bg-white p-10 text-center">
          <p className="text-neutral-600">Your wishlist is empty.</p>
          <Link
            href="/shop"
            className="mt-4 inline-block text-sm font-medium underline-offset-4 hover:underline"
          >
            Explore the collection
          </Link>
        </div>
      ) : (
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => (
            <li key={p.id} className="rounded-lg border border-neutral-200 bg-white overflow-hidden">
              <Link href={`/product/${p.slug}`}>
                <div className="aspect-[4/5] bg-neutral-100">
                  {p.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.image} alt="" className="h-full w-full object-cover" />
                  ) : null}
                </div>
                <div className="p-4">
                  {p.brand && <p className="text-xs text-neutral-500 uppercase tracking-wide">{p.brand}</p>}
                  <h2 className="font-medium mt-1">{p.name}</h2>
                  {p.min_price != null && (
                    <p className="mt-1 text-sm">{formatMoney(p.min_price)}</p>
                  )}
                </div>
              </Link>
              <div className="px-4 pb-4">
                <WishlistRemoveButton productId={p.id} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
