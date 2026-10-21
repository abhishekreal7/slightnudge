'use client';

export default function PlainStaticPage() {
  return (
    <div className="p-8">
      <h1 className="text-xl font-bold mb-4">Fixture 1: Plain Static</h1>
      <div
        id="target"
        data-source-file="fixtures/1-plain-static.tsx"
        data-source-line="7"
        className="ml-2"
      >
        Nudge Target
      </div>
    </div>
  );
}
