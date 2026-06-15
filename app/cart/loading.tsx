export default function CartLoading() {
  return (
    <div className="min-h-screen bg-[#F2F2F7] pt-4 pb-28 px-4 animate-pulse">
      <div className="h-7 w-24 bg-gray-200 rounded mb-6" />
      {Array(3)
        .fill(0)
        .map((_, i) => (
          <div key={i} className="flex gap-3 bg-white rounded-2xl p-3 mb-3">
            <div className="w-20 h-20 bg-gray-100 rounded-xl shrink-0" />
            <div className="flex-1 space-y-2 py-1">
              <div className="h-4 bg-gray-100 rounded w-4/5" />
              <div className="h-3 bg-gray-100 rounded w-1/3" />
              <div className="h-5 bg-gray-100 rounded w-20 mt-2" />
            </div>
          </div>
        ))}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4 pb-8">
        <div className="h-12 bg-gray-200 rounded-2xl" />
      </div>
    </div>
  );
}
