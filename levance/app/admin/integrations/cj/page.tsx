import { isCjConfigured } from "@/lib/integrations/cj/client";
import { verifyCjConnection } from "@/lib/integrations/cj";
import { createSupabaseAdminClient } from "@/lib/db/supabase-admin";
import { CjAdminPanel } from "@/components/admin/cj-admin-panel";

export const metadata = { title: "CJ Dropshipping — Admin" };

export default async function AdminCjPage() {
  const configured = isCjConfigured();
  let connection = { ok: false, message: "Not checked" };
  if (configured) {
    connection = await verifyCjConnection().catch((e) => ({
      ok: false,
      message: e instanceof Error ? e.message : "Failed",
    }));
  } else {
    connection = { ok: false, message: "CJ_API_KEY not set" };
  }

  let logs: Record<string, unknown>[] = [];
  try {
    const admin = createSupabaseAdminClient();
    const { data } = await admin
      .from("cj_sync_logs")
      .select("id, sync_type, status, message, created_at")
      .order("created_at", { ascending: false })
      .limit(20);
    logs = (data as Record<string, unknown>[]) ?? [];
  } catch {
    logs = [];
  }

  return (
    <div className="space-y-10">
      <div>
        <p className="eyebrow mb-2">Integrations</p>
        <h1 className="font-display text-3xl">CJ Dropshipping</h1>
        <p className="mt-2 text-sm text-neutral-600 max-w-xl">
          Supplier connection is verified server-side. Status below reflects a live token
          request when credentials are present — never a hard-coded “Connected” label.
        </p>
      </div>

      <dl className="rounded-lg border border-neutral-200 bg-white divide-y divide-neutral-100 max-w-lg">
        <div className="flex justify-between px-5 py-4 text-sm">
          <dt>Credentials</dt>
          <dd className={configured ? "text-success" : "text-neutral-500"}>
            {configured ? "CJ_API_KEY set" : "Not configured"}
          </dd>
        </div>
        <div className="flex justify-between px-5 py-4 text-sm">
          <dt>Connection</dt>
          <dd className={connection.ok ? "text-success" : "text-neutral-500"}>
            {connection.ok ? "Verified" : connection.message}
          </dd>
        </div>
      </dl>

      <CjAdminPanel />

      <section>
        <h2 className="font-display text-xl mb-4">Recent sync logs</h2>
        <div className="overflow-x-auto rounded border border-neutral-200">
          <table className="w-full text-sm text-left">
            <thead className="bg-neutral-50 text-neutral-600">
              <tr>
                <th className="px-4 py-2">Type</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Message</th>
                <th className="px-4 py-2">When</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-neutral-500">
                    No logs yet.
                  </td>
                </tr>
              )}
              {logs.map((l) => (
                <tr key={String(l.id)} className="border-t border-neutral-100">
                  <td className="px-4 py-2 font-mono text-xs">{String(l.sync_type)}</td>
                  <td className="px-4 py-2 capitalize">{String(l.status)}</td>
                  <td className="px-4 py-2 text-neutral-600 max-w-xs truncate">
                    {String(l.message ?? "")}
                  </td>
                  <td className="px-4 py-2 text-neutral-500">
                    {l.created_at
                      ? new Date(String(l.created_at)).toLocaleString()
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
