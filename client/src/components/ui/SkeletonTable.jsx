export default function SkeletonTable({ rows = 5, cols = 4 }) {
  const widths = ['w-24', 'w-32', 'w-20', 'w-28', 'w-16', 'w-36'];
  return (
    <div className="overflow-hidden">
      {/* header */}
      <div className="flex gap-4 px-4 py-3 border-b border-gray-100">
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className={`skeleton h-3 ${widths[i % widths.length]}`} />
        ))}
      </div>
      {/* rows */}
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4 px-4 py-4 border-b border-gray-50">
          {Array.from({ length: cols }).map((_, c) => (
            <div key={c} className={`skeleton h-4 ${widths[(r + c + 1) % widths.length]}`} />
          ))}
        </div>
      ))}
    </div>
  );
}
