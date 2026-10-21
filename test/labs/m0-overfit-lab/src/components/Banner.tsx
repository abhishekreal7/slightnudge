interface BannerProps {
  message: string;
}

export function Banner({ message }: BannerProps) {
  return (
    <aside id="promo-banner" className="mb-8 rounded-2xl bg-indigo-50 border border-indigo-200 p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-indigo-950">{message}</p>
        <span className="rounded-full bg-indigo-200 px-2.5 py-0.5 text-xs font-semibold text-indigo-800">Notice</span>
      </div>
    </aside>
  );
}
