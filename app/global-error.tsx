'use client';

import React, { useEffect } from 'react';

export default function GlobalError({
  error,
  retry,
  reset,
}: {
  error: unknown;
  retry?: () => void;
  reset?: () => void;
}) {
  useEffect(() => {
    console.error('[SlightNudge Global Error]:', error);
  }, [error]);

  const handleRetry = () => {
    if (typeof retry === 'function') {
      retry();
    } else if (typeof reset === 'function') {
      reset();
    } else {
      window.location.reload();
    }
  };

  const errorMessage = error instanceof Error ? error.message : typeof error === 'string' ? error : 'An unexpected system error occurred.';
  const errorDigest = typeof error === 'object' && error !== null && 'digest' in error ? String((error as any).digest) : undefined;

  return (
    <html lang="en">
      <head>
        <title>Application Error — SlightNudge</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body style={{
        margin: 0,
        padding: 0,
        backgroundColor: '#0a0d0b',
        color: '#e5ece7',
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{
          maxWidth: '520px',
          margin: '24px',
          padding: '36px 32px',
          backgroundColor: '#121714',
          border: '1px solid #1f2722',
          borderRadius: '16px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
          textAlign: 'center',
        }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            color: '#ef4444',
            marginBottom: '20px',
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>

          <h1 style={{
            fontSize: '22px',
            fontWeight: 600,
            margin: '0 0 8px 0',
            letterSpacing: '-0.02em',
          }}>
            Application Error
          </h1>

          <p style={{
            fontSize: '14px',
            color: '#8f9d94',
            lineHeight: 1.5,
            margin: '0 0 24px 0',
          }}>
            A critical error occurred while loading the application shell. Your project files and workspace configurations on disk are safe.
          </p>

          <div style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'center',
            flexWrap: 'wrap',
          }}>
            <button
              onClick={handleRetry}
              style={{
                backgroundColor: '#10b981',
                color: '#062014',
                border: 'none',
                borderRadius: '8px',
                padding: '10px 20px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'background-color 0.15s ease',
              }}
              onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#059669')}
              onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#10b981')}
            >
              Try Again
            </button>

            <button
              onClick={() => (window.location.href = '/workspace')}
              style={{
                backgroundColor: 'transparent',
                color: '#c5d2c9',
                border: '1px solid #28342c',
                borderRadius: '8px',
                padding: '10px 20px',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
              }}
              onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#18211b')}
              onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              Return to Workspace
            </button>
          </div>

          {(errorMessage || errorDigest) && (
            <details style={{
              marginTop: '28px',
              textAlign: 'left',
              fontSize: '12px',
              color: '#65736a',
              borderTop: '1px solid #1a221d',
              paddingTop: '16px',
            }}>
              <summary style={{ cursor: 'pointer', outline: 'none' }}>Technical diagnostics</summary>
              <div style={{
                marginTop: '8px',
                padding: '10px',
                backgroundColor: '#0a0d0b',
                borderRadius: '6px',
                fontFamily: 'monospace',
                fontSize: '11px',
                color: '#8f9d94',
                wordBreak: 'break-all',
              }}>
                {errorMessage}
                {errorDigest && <div style={{ marginTop: '4px', color: '#526057' }}>Digest: {errorDigest}</div>}
              </div>
            </details>
          )}
        </div>
      </body>
    </html>
  );
}
