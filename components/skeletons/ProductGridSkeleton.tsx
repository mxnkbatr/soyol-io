export default function ProductGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 px-3 lg:hidden">
      {Array(count)
        .fill(0)
        .map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-[20px] overflow-hidden shadow-[0_4px_16px_rgba(0,0,0,0.03)]"
          >
            <div className="aspect-square bg-[#F7F7F5] animate-pulse rounded-t-[20px]" />
            <div className="px-3.5 pt-3 pb-3.5 flex flex-col gap-2.5">
              <div className="h-3.5 bg-gray-100 rounded animate-pulse w-5/6" />
              <div className="h-3.5 bg-gray-100 rounded animate-pulse w-1/2" />
              <div className="flex justify-between items-end mt-2">
                <div className="h-5 bg-gray-100 rounded animate-pulse w-16" />
                <div className="w-[34px] h-[34px] bg-gray-100 rounded-[12px] animate-pulse shrink-0" />
              </div>
            </div>
          </div>
        ))}
    </div>
  );
}
