export default function TermsPage() {
  return (
    <div className="py-14 px-4 sm:px-6 max-w-2xl mx-auto space-y-6 text-xs text-slate-700 leading-relaxed">
      <div className="space-y-1 border-b border-slate-200 pb-4">
        <h1 className="text-xl font-bold text-slate-900">Terms of service</h1>
        <p className="text-[11px] text-slate-400">Last updated: October 2026</p>
      </div>

      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-slate-900">1. Mandatory ownership verification</h2>
        <p>
          ShipCheck exclusively automates testing against domains where the user has successfully proven legal ownership or administrative authorization via DNS TXT record, HTML meta tag, or well-known verification file. Testing third-party sites without authorization is strictly prohibited.
        </p>
      </div>

      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-slate-900">2. Destructive actions and scope lock</h2>
        <p>
          Our automated browsers are strictly instructed never to authorize live monetary transactions, perform bulk deletions, or harvest personal data. Test runs are scoped strictly to the verified hostname and will not follow external links or attempt cross-domain exploits.
        </p>
      </div>

      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-slate-900">3. Payments and Merchant of Record</h2>
        <p>
          All financial transactions are processed securely via Dodo Payments acting as Merchant of Record. ShipCheck operates strictly on a one-time per-scan basis with no automatic renewals or recurring subscription fees.
        </p>
      </div>
    </div>
  );
}
