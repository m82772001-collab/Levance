import type { ReactNode } from "react";

/**
 * Shared shell for foundation-phase route placeholders. Every route
 * defined in the spec exists and renders — implementation lands
 * phase-by-phase per the master build spec's sequencing.
 */
export function RouteScaffold({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="container-content py-24">
      <p className="eyebrow mb-4">Foundation scaffold</p>
      <h1 className="font-display text-3xl">{title}</h1>
      <p className="mt-3 max-w-xl text-neutral-600">{description}</p>
      {children}
    </div>
  );
}
