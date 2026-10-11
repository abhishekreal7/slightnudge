'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Copy, Check } from 'lucide-react';
import { trackFunnelEvent } from '@/lib/analytics/events';

export default function NewRunPage() {
  const router = useRouter();
  const [url, setUrl] = useState('');
  const [urlTouched, setUrlTouched] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);

  const [notes, setNotes] = useState('');
  const [showCreds, setShowCreds] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // Ownership verification state
  const [siteToken, setSiteToken] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [metaCopied, setMetaCopied] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);

  // Validate URL format
  const validateUrl = (val: string): boolean => {
    if (!val) {
      setUrlError('URL is required.');
      return false;
    }
    try {
      const parsed = new URL(val);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        setUrlError('URL must begin with http:// or https://');
        return false;
      }
      setUrlError(null);
      return true;
    } catch {
      setUrlError('Please enter a valid URL (e.g. https://yourapp.com).');
      return false;
    }
  };

  // Generate verification instructions when URL is entered
  const handleInitiateVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    setUrlTouched(true);
    if (!validateUrl(url)) return;

    setGeneralError(null);
    setVerificationError(null);
    setIsLoading(true);

    try {
      const resp = await fetch('/api/sites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const data = await resp.json();

      if (!resp.ok) {
        setGeneralError(data.error || 'Failed to initialize site verification');
        setIsLoading(false);
        return;
      }

      setSiteToken(data.verificationInstructions.token);
      // Localhost bypass for dev testing
      if (url.includes('localhost') || url.includes('127.0.0.1')) {
        setVerified(true);
      }
    } catch (err: any) {
      setGeneralError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyNow = async () => {
    if (!siteToken) return;
    setIsVerifying(true);
    setVerificationError(null);

    try {
      const resp = await fetch('/api/sites/current/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, token: siteToken }),
      });
      const data = await resp.json();

      if (data.verified) {
        setVerified(true);
      } else {
        setVerificationError(data.error || 'Verification tag or file was not found on your site yet.');
      }
    } catch (err: any) {
      setVerificationError(err.message);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleStartScan = async (kind: 'preview' | 'full') => {
    setIsLoading(true);
    setGeneralError(null);

    try {
      const payload: any = {
        url,
        kind,
        notes: notes || undefined,
        skipOwnershipCheck: url.includes('localhost'),
      };

      if (showCreds && (username || password)) {
        payload.credentials = { username, password };
      }

      const resp = await fetch('/api/runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await resp.json();
      if (!resp.ok) {
        setGeneralError(data.error || 'Failed to start scan');
        setIsLoading(false);
        return;
      }

      trackFunnelEvent('url_submitted', { url, kind, runId: data.runId });
      router.push(`/runs/${data.runId}`);
    } catch (err: any) {
      setGeneralError(err.message);
      setIsLoading(false);
    }
  };

  const metaTagSnippet = `<meta name="shipcheck-verification" content="${siteToken || ''}">`;

  return (
    <div className="py-12 px-4 sm:px-6 max-w-2xl mx-auto space-y-8">
      {/* Page Header */}
      <div className="space-y-1">
        <h1 className="text-xl font-bold text-slate-900">Start an automated scan</h1>
        <p className="text-xs text-slate-500 leading-relaxed">
          Provide your web app URL. Cloud Chromium runners will crawl routes, fill forms, and test mobile viewports.
        </p>
      </div>

      <div className="rounded-md border border-slate-200 bg-white p-6 sm:p-7 space-y-6">
        {/* Step 1: Target URL */}
        <form onSubmit={handleInitiateVerification} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="url-input" className="block text-xs font-semibold text-slate-800">
              Web application URL
            </label>
            <div className="flex gap-2">
              <input
                id="url-input"
                type="url"
                required
                autoFocus
                placeholder="https://yourapp.com"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  if (urlTouched) validateUrl(e.target.value);
                  setSiteToken(null);
                  setVerified(false);
                }}
                onBlur={() => {
                  setUrlTouched(true);
                  validateUrl(url);
                }}
                className={`flex-1 rounded border px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none ${
                  urlError ? 'border-red-400 bg-red-50/20' : 'border-slate-300 bg-white'
                }`}
              />
              <button
                type="submit"
                disabled={isLoading || !url}
                className="rounded border border-slate-900 bg-slate-900 px-4 py-2 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-50 transition"
              >
                {isLoading ? 'Checking...' : 'Check URL'}
              </button>
            </div>

            {urlError && (
              <p className="text-[11px] text-red-700 font-medium">{urlError}</p>
            )}

            <p className="text-[11px] text-slate-400">
              Must be a web app you control. Localhost targets (e.g. http://localhost:3000) are auto-verified for testing.
            </p>
          </div>
        </form>

        {/* Ownership Verification Step */}
        {siteToken && !verified && (
          <div className="rounded border border-slate-300 bg-slate-50 p-4 space-y-3.5 text-xs">
            <div className="space-y-1">
              <h2 className="font-semibold text-slate-900">
                Site ownership verification
              </h2>
              <p className="text-slate-600 leading-relaxed text-[11px]">
                To prevent unauthorized scanning of third-party domains, ShipCheck requires proof of domain control. Add one of the following to your site:
              </p>
            </div>

            {/* Meta tag option */}
            <div className="space-y-1">
              <span className="text-[11px] font-medium text-slate-700">Option A: HTML meta tag in &lt;head&gt;</span>
              <div className="flex items-center justify-between rounded border border-slate-200 bg-white p-2 font-mono text-[11px] text-slate-800">
                <span className="truncate mr-2">{metaTagSnippet}</span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(metaTagSnippet);
                    setMetaCopied(true);
                    setTimeout(() => setMetaCopied(false), 2000);
                  }}
                  className="inline-flex items-center gap-1 text-slate-600 hover:text-slate-900 font-sans text-xs shrink-0"
                >
                  {metaCopied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700 font-medium">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Well-known file option */}
            <div className="text-[11px] text-slate-600 pt-1">
              <span>Option B: Serve verification token at </span>
              <code className="text-slate-900 font-mono">/.well-known/shipcheck-verify.txt</code>
            </div>

            <div className="pt-2 flex items-center justify-between border-t border-slate-200">
              <button
                type="button"
                onClick={handleVerifyNow}
                disabled={isVerifying}
                className="rounded border border-slate-900 bg-slate-900 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-50 transition"
              >
                {isVerifying ? 'Checking domain...' : 'Verify domain'}
              </button>
              {verificationError && (
                <span className="text-[11px] text-red-700 font-medium">
                  {verificationError}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Verified Status Confirmation */}
        {verified && (
          <div className="rounded border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs text-emerald-900 flex items-center gap-2">
            <span className="font-semibold">✓ Domain ownership verified</span>
            <span className="text-emerald-700 text-[11px]">— Ready to run scan.</span>
          </div>
        )}

        {/* Optional Testing Notes */}
        <div className="space-y-1.5">
          <label htmlFor="notes-input" className="block text-xs font-semibold text-slate-800">
            Testing notes (optional)
          </label>
          <input
            id="notes-input"
            type="text"
            placeholder="e.g. Focus on pricing table mobile overflow and registration form"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none"
          />
        </div>

        {/* Optional Credentials Drawer */}
        <div className="border-t border-slate-100 pt-4 space-y-3">
          <button
            type="button"
            onClick={() => setShowCreds(!showCreds)}
            className="text-xs font-medium text-slate-700 hover:text-slate-900 flex items-center gap-1.5"
          >
            <Lock className="w-3.5 h-3.5 text-slate-500" />
            <span>{showCreds ? 'Remove test credentials' : 'Add test account credentials (optional)'}</span>
          </button>

          {showCreds && (
            <div className="rounded border border-slate-200 bg-slate-50 p-3.5 space-y-3 text-xs">
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Credentials are encrypted at rest with AES-256-GCM and deleted immediately upon scan completion. Use a non-sensitive test account.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <input
                  type="text"
                  placeholder="Test username / email"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900"
                />
                <input
                  type="password"
                  placeholder="Test password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900"
                />
              </div>
            </div>
          )}
        </div>

        {generalError && (
          <div className="rounded border border-red-300 bg-red-50 p-3 text-xs text-red-900">
            {generalError}
          </div>
        )}

        {/* Submit Action */}
        <div className="pt-2">
          <button
            type="button"
            disabled={!verified || isLoading}
            onClick={() => handleStartScan('preview')}
            className="w-full rounded border border-slate-900 bg-slate-900 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-40 transition shadow-xs"
          >
            {isLoading ? 'Starting runner...' : 'Run free scan (2 min)'}
          </button>
        </div>
      </div>
    </div>
  );
}
