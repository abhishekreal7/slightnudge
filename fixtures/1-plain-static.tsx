'use client';

export default function PlainStaticPage() {
  return (
    <div className="p-8 max-w-xl mx-auto bg-slate-900 border border-slate-800 rounded-xl shadow-xl">
      <h1 className="text-lg font-bold mb-4 text-white">Fixture 1: Plain Static</h1>
      <div
        id="target"
        data-source-file="fixtures/1-plain-static.tsx"
        data-source-line="7"
        className="ml-2 mt-5"
        style={{ display: 'inline-flex', alignItems: 'center', padding: '10px 20px', background: 'linear-gradient(135deg, #4f46e5, #6366f1)', color: '#ffffff', borderRadius: '8px', fontWeight: 600, fontSize: '14px', cursor: 'pointer', boxShadow: '0 4px 14px rgba(79, 70, 229, 0.35)' }}
      >
        ✦ Nudge Target Button
      </div>
    </div>
  );
}
