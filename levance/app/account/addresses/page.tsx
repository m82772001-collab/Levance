import { requireUser } from "@/lib/auth/rbac";
import { createSupabaseServerClient } from "@/lib/db/supabase-server";
import { AddressList } from "@/components/account/address-list";

export const metadata = { title: "Addresses" };

export default async function AddressesPage() {
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();
  const { data: addresses } = await supabase
    .from("addresses")
    .select("*")
    .eq("user_id", user.id)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-8">
      <div>
        <p className="eyebrow mb-2">Account</p>
        <h1 className="font-display text-3xl">Addresses</h1>
      </div>
      <AddressList addresses={(addresses as Record<string, unknown>[]) ?? []} />
    </div>
  );
}
