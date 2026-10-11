import Link from 'next/link';

export default function FixturesIndexPage() {
  const fixtures = [
    { id: '1', title: '1. Plain static className', path: '/fixtures/1', file: 'fixtures/1-plain-static.tsx' },
    { id: '2', title: '2. Several utilities in one className', path: '/fixtures/2', file: 'fixtures/2-several-utilities.tsx' },
    { id: '3', title: '3. className built with cn()/clsx and a condition', path: '/fixtures/3', file: 'fixtures/3-conditional-cn.tsx' },
    { id: '4', title: '4. One component rendered twice with different props', path: '/fixtures/4', file: 'fixtures/4-shared-component.tsx' },
    { id: '5', title: '5. Responsive classes (md:, lg:)', path: '/fixtures/5', file: 'fixtures/5-responsive-classes.tsx' },
  ];

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">slightnudge Fixture Suite</h1>
      <p className="text-slate-600 mb-6">Test pages for AST-based Tailwind visual nudging.</p>
      <div className="grid gap-4">
        {fixtures.map((f) => (
          <Link
            key={f.id}
            href={f.path}
            className="p-4 border border-slate-200 rounded-lg hover:border-indigo-500 hover:shadow-sm transition block bg-white"
          >
            <div className="font-semibold text-slate-900">{f.title}</div>
            <div className="text-xs text-slate-500 font-mono mt-1">{f.file}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
