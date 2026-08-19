export function SiteFooter() {
  return (
    <footer className="border-t border-neutral-200 bg-obsidian text-ivory">
      <div className="container-content py-16 grid gap-10 md:grid-cols-4">
        <div>
          <p className="font-display text-lg tracking-widest2 uppercase">Lévance</p>
          <p className="mt-3 text-sm text-neutral-400">Elevate your everyday.</p>
        </div>
        <div className="text-sm text-neutral-400">
          &copy; {new Date().getFullYear()} LÉVANCE. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
