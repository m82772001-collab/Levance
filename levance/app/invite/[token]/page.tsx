import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/session";
import { AcceptInvitationForm } from "@/components/membership/accept-invitation-form";

export const metadata = {
  title: "Monarch Invitation",
};

type Props = {
  params: Promise<{ token: string }>;
};

export default async function InviteAcceptPage({ params }: Props) {
  const { token } = await params;
  const user = await getCurrentUser();

  return (
    <div className="min-h-screen flex items-center justify-center bg-obsidian px-6">
      <div className="w-full max-w-md text-center text-ivory">
        <p className="eyebrow mb-4 text-champagne">Monarch Invitation</p>
        <h1 className="font-display text-3xl md:text-4xl">You have been invited</h1>
        <p className="mt-4 text-neutral-400 text-sm">
          This invitation grants Monarch membership — the most exclusive circle
          at LÉVANCE. It cannot be purchased.
        </p>

        {user ? (
          <div className="mt-10">
            <AcceptInvitationForm token={token} />
          </div>
        ) : (
          <div className="mt-10 space-y-4">
            <p className="text-sm text-neutral-300">
              Sign in or create an account with the invited email to accept.
            </p>
            <div className="flex flex-col gap-3">
              <Link
                href={`/login?redirectTo=/invite/${encodeURIComponent(token)}`}
                className="rounded bg-champagne px-6 py-3 text-sm font-medium text-obsidian"
              >
                Sign in to accept
              </Link>
              <Link
                href={`/signup?redirectTo=/invite/${encodeURIComponent(token)}`}
                className="rounded border border-neutral-600 px-6 py-3 text-sm font-medium text-ivory hover:border-champagne"
              >
                Create account
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
