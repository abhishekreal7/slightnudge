'use client';

interface CardProps {
  id: string;
  title: string;
  variant: 'primary' | 'secondary';
}

function Card({ id, title, variant }: CardProps) {
  return (
    <div
      id={id}
      data-source-file="fixtures/4-shared-component.tsx"
      data-source-line="11"
      className="ml-2 p-4 rounded border border-slate-300"
    >
      <span className="font-semibold">{title}</span> ({variant})
    </div>
  );
}

export default function SharedComponentPage() {
  return (
    <div className="p-8 space-y-4">
      <h1 className="text-xl font-bold mb-4">Fixture 4: Shared Component Rendered Twice</h1>
      <Card id="card-1" title="Card Alpha" variant="primary" />
      <Card id="card-2" title="Card Beta" variant="secondary" />
    </div>
  );
}
