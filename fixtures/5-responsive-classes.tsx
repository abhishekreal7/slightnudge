'use client';

export default function ResponsiveClassesPage() {
  return (
    <div className="p-8">
      <h1 className="text-xl font-bold mb-4">Fixture 5: Responsive Classes</h1>
      <div
        id="target"
        className="ml-2 md:ml-4 lg:ml-8 p-4 bg-purple-600 text-white rounded"
      >
        Responsive Element
      </div>
    </div>
  );
}
