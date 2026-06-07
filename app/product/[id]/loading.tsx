export default function ProductLoading() {
  return (
    <div className="min-h-screen bg-[#F2F2F7] pb-24 lg:pb-8 animate-pulse">
      <div className="lg:hidden aspect-square bg-white" />
      <div className="max-w-7xl mx-auto px-4 lg:px-8 pt-4 lg:pt-8">
        <div className="hidden lg:grid lg:grid-cols-2 lg:gap-10">
          <div className="aspect-square bg-white rounded-2xl" />
          <div className="space-y-4">
            <div className="h-4 w-24 bg-gray-200 rounded" />
            <div className="h-8 w-3/4 bg-gray-200 rounded" />
            <div className="h-10 w-32 bg-gray-200 rounded" />
            <div className="h-24 w-full bg-gray-200 rounded-2xl mt-6" />
          </div>
        </div>
        <div className="lg:hidden space-y-3 mt-4">
          <div className="h-4 w-20 bg-gray-200 rounded" />
          <div className="h-7 w-full bg-gray-200 rounded" />
          <div className="h-8 w-28 bg-gray-200 rounded" />
        </div>
      </div>
    </div>
  );
}
