import { RouteScaffold } from "@/lib/utilities/placeholder";
import { isStripeConfigured } from "@/lib/integrations/stripe/client";
import { isCjConfigured } from "@/lib/integrations/cj/client";

/**
 * Connection status reflects ACTUAL configured environment variables —
 * never a hard-coded "Connected" label. See spec section 13/23.
 */
export default function AdminIntegrationsPage() {
  const stripeReady = isStripeConfigured();
  const cjReady = isCjConfigured();

  return (
    <RouteScaffold
      title="Integrations"
      description="Status reflects real environment configuration, not a hard-coded label."
    >
      <dl className="mt-8 space-y-4">
        <div className="flex items-center justify-between border-b border-neutral-200 pb-4">
          <dt className="font-medium">Stripe</dt>
          <dd className={stripeReady ? "text-success" : "text-neutral-500"}>
            {stripeReady ? "Configured" : "Not configured"}
          </dd>
        </div>
        <div className="flex items-center justify-between border-b border-neutral-200 pb-4">
          <dt className="font-medium">CJ Dropshipping</dt>
          <dd className={cjReady ? "text-success" : "text-neutral-500"}>
            {cjReady ? "Configured" : "Not configured"}
          </dd>
        </div>
      </dl>
    </RouteScaffold>
  );
}
