export default function RefundsPage() {
  return (
    <div className="py-14 px-4 sm:px-6 max-w-2xl mx-auto space-y-6 text-xs text-slate-700 leading-relaxed">
      <div className="space-y-1 border-b border-slate-200 pb-4">
        <h1 className="text-xl font-bold text-slate-900">Refund policy</h1>
        <p className="text-[11px] text-slate-400">Last updated: October 2026</p>
      </div>

      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-slate-900">1. Automatic failure refunds</h2>
        <p>
          If a paid scan run fails entirely due to an infrastructure outage, browser crash, or internal pipeline error on our end, our system marks the run as refunded and automatically triggers a 100% refund via Dodo Payments back to your original payment method.
        </p>
      </div>

      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-slate-900">2. Target unreachable or invalid URLs</h2>
        <p>
          If your target URL fails DNS resolution or returns a 5xx error before testing begins, you will be notified immediately during the preflight stage and no charge will be incurred.
        </p>
      </div>

      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-slate-900">3. Contact and disputes</h2>
        <p>
          For manual refund inquiries or dispute reviews, contact support with your scan run ID and Dodo Payment reference.
        </p>
      </div>
    </div>
  );
}
