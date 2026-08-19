import { listMonarchInvitations } from "@/lib/membership/invitations";
import { adminListMemberships } from "@/lib/membership/queries";
import { CreateInvitationForm } from "@/components/admin/create-invitation-form";

export const metadata = { title: "Memberships — Admin" };

export default async function AdminMembershipsPage() {
  const [memberships, invitations] = await Promise.all([
    adminListMemberships({ limit: 40 }).catch(() => []),
    listMonarchInvitations(30).catch(() => []),
  ]);

  return (
    <div className="space-y-12">
      <div>
        <p className="eyebrow mb-2">Admin</p>
        <h1 className="font-display text-3xl">Memberships</h1>
        <p className="mt-2 text-sm text-neutral-600 max-w-xl">
          View customer memberships and manage Monarch invitations. Only
          authorized founder/admin accounts can create or revoke Monarch
          access. All changes are server-side and audited.
        </p>
      </div>

      <section className="rounded-lg border border-neutral-200 bg-white p-6">
        <h2 className="font-display text-xl mb-4">Create Monarch invitation</h2>
        <CreateInvitationForm />
      </section>

      <section>
        <h2 className="font-display text-xl mb-4">Recent invitations</h2>
        <div className="overflow-x-auto rounded border border-neutral-200">
          <table className="w-full text-sm text-left">
            <thead className="bg-neutral-50 text-neutral-600">
              <tr>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Expires</th>
                <th className="px-4 py-3 font-medium">Created</th>
              </tr>
            </thead>
            <tbody>
              {invitations.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-neutral-500">
                    No invitations yet.
                  </td>
                </tr>
              )}
              {invitations.map((inv: Record<string, unknown>) => (
                <tr key={String(inv.id)} className="border-t border-neutral-100">
                  <td className="px-4 py-3">{String(inv.email ?? "— any —")}</td>
                  <td className="px-4 py-3 capitalize">{String(inv.status)}</td>
                  <td className="px-4 py-3">
                    {inv.expires_at
                      ? new Date(String(inv.expires_at)).toLocaleDateString()
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {inv.created_at
                      ? new Date(String(inv.created_at)).toLocaleDateString()
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="font-display text-xl mb-4">Customer memberships</h2>
        <div className="overflow-x-auto rounded border border-neutral-200">
          <table className="w-full text-sm text-left">
            <thead className="bg-neutral-50 text-neutral-600">
              <tr>
                <th className="px-4 py-3 font-medium">User</th>
                <th className="px-4 py-3 font-medium">Tier</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Updated</th>
              </tr>
            </thead>
            <tbody>
              {memberships.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-neutral-500">
                    No membership rows yet. Apply migration 0010 and ensure
                    users have been assigned COMMON on signup.
                  </td>
                </tr>
              )}
              {memberships.map((m: Record<string, unknown>) => (
                <tr key={String(m.id)} className="border-t border-neutral-100">
                  <td className="px-4 py-3 font-mono text-xs">
                    {String(m.user_id).slice(0, 8)}…
                  </td>
                  <td className="px-4 py-3 font-medium">{String(m.tier)}</td>
                  <td className="px-4 py-3 capitalize">{String(m.status)}</td>
                  <td className="px-4 py-3">
                    {m.updated_at
                      ? new Date(String(m.updated_at)).toLocaleDateString()
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
