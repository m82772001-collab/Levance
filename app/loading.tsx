import { Emblem } from "@/components/shared/emblem";

export default function Loading() {
  return (
    <main className="flex min-h-[50vh] items-center justify-center bg-ivory" aria-label="Loading">
      <Emblem variant="loading" />
    </main>
  );
}
