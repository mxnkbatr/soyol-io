export default function Loading() {
  return (
    <div className="flex h-[60vh] w-full items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-[#FF7900]"></div>
        <p className="text-sm text-gray-500 font-medium animate-pulse">Уншиж байна...</p>
      </div>
    </div>
  );
}
