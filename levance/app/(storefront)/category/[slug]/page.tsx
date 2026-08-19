import Link from "next/link";
import { getCategoryBySlug, listProducts } from "@/lib/catalog/queries";
import { ProductCard } from "@/components/storefront/product-card";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ sort?: string; page?: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  try {
    const cat = await getCategoryBySlug(slug);
    return {
      title: cat.name,
      description: `Shop ${cat.name} at LÉVANCE.`,
    };
  } catch {
    return { title: "Category" };
  }
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const category = await getCategoryBySlug(slug);
  const page = Number(sp.page) || 1;
  const sort = (sp.sort as "newest" | "price_asc" | "price_desc" | "name") || "newest";

  const { products, total, pageSize } = await listProducts({
    categoryId: category.id,
    sort,
    page,
    pageSize: 12,
  });

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="container-content py-10 md:py-16">
      <div className="mb-10">
        <p className="eyebrow mb-2">Category</p>
        <h1 className="font-display text-3xl md:text-5xl">{category.name}</h1>
        <p className="mt-3 text-sm text-neutral-500">
          {total} {total === 1 ? "piece" : "pieces"}
        </p>
      </div>

      <div className="mb-8 flex flex-wrap gap-3 text-sm">
        {[
          { value: "newest", label: "Newest" },
          { value: "price_asc", label: "Price ↑" },
          { value: "price_desc", label: "Price ↓" },
          { value: "name", label: "Name" },
        ].map((s) => (
          <Link
            key={s.value}
            href={`/category/${slug}?sort=${s.value}`}
            className={`rounded px-3 py-1.5 ${
              sort === s.value
                ? "bg-obsidian text-ivory"
                : "border border-neutral-200 hover:border-obsidian"
            }`}
          >
            {s.label}
          </Link>
        ))}
      </div>

      {products.length === 0 ? (
        <div className="rounded-lg border border-neutral-200 p-12 text-center text-neutral-600">
          No products in this category yet.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 md:gap-6">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <nav className="mt-12 flex justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
            <Link
              key={n}
              href={`/category/${slug}?sort=${sort}&page=${n}`}
              className={`min-w-10 rounded px-3 py-2 text-sm text-center ${
                n === page ? "bg-obsidian text-ivory" : "border border-neutral-200"
              }`}
            >
              {n}
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
}
