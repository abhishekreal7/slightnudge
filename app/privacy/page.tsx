export default function PrivacyPage() {
  return (
    <div className="py-14 px-4 sm:px-6 max-w-2xl mx-auto space-y-6 text-xs text-slate-700 leading-relaxed">
      <div className="space-y-1 border-b border-slate-200 pb-4">
        <h1 className="text-xl font-bold text-slate-900">Privacy policy</h1>
        <p className="text-[11px] text-slate-400">Last updated: October 2026</p>
      </div>

      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-slate-900">1. Test credentials zero retention</h2>
        <p>
          If you provide optional credentials for test accounts, they are encrypted at rest using server-side AES-256-GCM. Credentials are decrypted only in memory by the background test worker and are purged permanently from the database the moment the run concludes.
        </p>
      </div>

      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-slate-900">2. Evidence and artifacts</h2>
        <p>
          Screenshots, console logs, and failure traces captured during testing belong solely to you. Private share links are generated using cryptographically unguessable tokens, and signed URLs are enforced for all stored media.
        </p>
      </div>

      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-slate-900">3. Untrusted website content</h2>
        <p>
          We treat all content extracted from target websites strictly as untrusted data. We never index or share your private source code, internal APIs, or business logic.
        </p>
      </div>
    </div>
  );
}
