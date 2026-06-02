export default function CategoryLoading() {
  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Hero skeleton */}
      <div className="bg-slate-900 pt-32 pb-24 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="h-3 bg-white/10 rounded w-28 mb-8 animate-pulse" />
          <div className="h-14 bg-white/10 rounded-2xl w-72 mb-4 animate-pulse" />
          <div className="h-3 bg-white/10 rounded w-80 animate-pulse" />
        </div>
      </div>
      {/* Toolbar skeleton */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="h-16 bg-white rounded-3xl border border-slate-100 mb-12 animate-pulse" />
        {/* Product grid skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {Array(8).fill(0).map((_, i) => (
            <div key={i} className="bg-white rounded-[28px] overflow-hidden border border-slate-100 shadow-sm">
              <div className="aspect-[4/5] bg-slate-100 animate-pulse" style={{ animationDelay: `${i * 50}ms` }} />
              <div className="p-4 space-y-2.5">
                <div className="flex gap-0.5">
                  {Array(5).fill(0).map((_, j) => (
                    <div key={j} className="w-3 h-3 bg-slate-100 rounded animate-pulse" />
                  ))}
                </div>
                <div className="h-3 bg-slate-100 rounded animate-pulse w-4/5" />
                <div className="h-3 bg-slate-100 rounded animate-pulse w-3/5" />
                <div className="flex justify-between items-center pt-1">
                  <div className="h-5 bg-slate-100 rounded animate-pulse w-20" />
                  <div className="w-9 h-9 bg-slate-100 rounded-xl animate-pulse" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
