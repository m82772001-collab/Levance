import { requireAdmin } from "@/lib/auth/rbac";

/**
 * Every route under /admin is gated here server-side via requireAdmin(),
 * which redirects non-admins before any admin data is fetched or
 * rendered. RLS policies on admin-touched tables provide a second,
 * independent layer — see supabase/migrations/0002_profiles_rbac.sql.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="border-b border-neutral-200 bg-obsidian text-ivory">
        <div className="container-content flex h-16 items-center justify-between">
          <span className="font-display tracking-widest2 uppercase text-sm">
            Lévance Admin
          </span>
        </div>
      </div>
      <div className="container-content py-10">{children}</div>
    </div>
  );
}
