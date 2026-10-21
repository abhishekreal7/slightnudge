export default function DynamicWidget() {
  return (
    <div id="dynamic-widget" className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-slate-900">Live Analytics Widget</h3>
      <p className="mt-2 text-sm text-slate-600">Loaded dynamically to test code-splitting resilience.</p>
      <div className="mt-4 flex items-center gap-2">
        <span className="size-2 rounded-full bg-emerald-500" />
        <span className="text-xs font-medium text-slate-500">Live updates active</span>
      </div>
    </div>
  );
}
