function SharedBadge() {
  return <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">Enterprise Ready</span>;
}

export function FooterSection() {
  return (
    <footer id="footer-section" className="border-t border-slate-200 bg-white py-12">
      <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
        <a href="#top" className="text-sm font-semibold text-indigo-600">OverfitLab Home</a>
        <div className="flex items-center gap-3">
          <SharedBadge />
          <SharedBadge />
        </div>
        <div>
          <button type="button">Raw Action</button>
        </div>
      </div>
    </footer>
  );
}
