import { requireUser } from "@/lib/auth/rbac";
import { createSupabaseServerClient } from "@/lib/db/supabase-server";
import { ProfileForm } from "@/components/account/profile-form";

export const metadata = { title: "Profile" };

export default async function ProfilePage() {
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();

  return (
    <div className="max-w-lg space-y-8">
      <div>
        <p className="eyebrow mb-2">Account</p>
        <h1 className="font-display text-3xl">Profile</h1>
      </div>
      <ProfileForm
        email={user.email ?? ""}
        fullName={(profile as { full_name: string | null } | null)?.full_name ?? ""}
      />
    </div>
  );
}
