export default function CheckoutLoading() {
  return (
    <div className="min-h-screen bg-[#F2F2F7] pt-4 pb-28 px-4 animate-pulse">
      <div className="h-7 w-36 bg-gray-200 rounded mb-6" />
      <div className="bg-white rounded-2xl p-4 mb-4 space-y-3">
        <div className="h-4 bg-gray-100 rounded w-1/2" />
        <div className="h-10 bg-gray-100 rounded-xl" />
        <div className="h-10 bg-gray-100 rounded-xl" />
      </div>
      <div className="bg-white rounded-2xl p-4 mb-4 space-y-3">
        <div className="h-4 bg-gray-100 rounded w-1/3" />
        <div className="h-16 bg-gray-100 rounded-xl" />
      </div>
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4 pb-8">
        <div className="h-12 bg-gray-200 rounded-2xl" />
      </div>
    </div>
  );
}
