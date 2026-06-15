import ProductGridSkeleton from '@/components/skeletons/ProductGridSkeleton';

export default function SearchLoading() {
  return (
    <div className="min-h-screen bg-white pt-4 pb-28">
      <div className="px-4 mb-4">
        <div className="h-11 bg-gray-100 rounded-2xl animate-pulse" />
      </div>
      <ProductGridSkeleton count={4} />
    </div>
  );
}
