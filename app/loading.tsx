import ProductGridSkeleton from '@/components/skeletons/ProductGridSkeleton';

export default function Loading() {
  return (
    <div className="min-h-screen bg-white pt-2">
      <div className="mx-4 mt-4 rounded-[28px] bg-slate-100 animate-pulse aspect-[16/9] lg:hidden" />
      <div className="mt-6 px-4 lg:hidden">
        <div className="h-5 w-32 bg-gray-100 rounded animate-pulse mb-4" />
        <ProductGridSkeleton count={6} />
      </div>
    </div>
  );
}
