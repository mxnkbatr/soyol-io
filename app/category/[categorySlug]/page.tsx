import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import CategoryPageClient from './CategoryPageClient';
import type { Metadata } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

async function getCategoryData(slug: string) {
  try {
    const [categoryRes, productsRes] = await Promise.all([
      fetch(`${BASE_URL}/api/categories/${slug}`, {
        next: { revalidate: 60 },
      }),
      fetch(`${BASE_URL}/api/products?categorySlug=${slug}&sortBy=newest&limit=40`, {
        next: { revalidate: 60 },
      }),
    ]);

    if (!categoryRes.ok) return null;

    const category = await categoryRes.json();
    const productsData = productsRes.ok ? await productsRes.json() : { products: [] };

    return { category, products: productsData.products || [] };
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: { categorySlug: string };
}): Promise<Metadata> {
  const data = await getCategoryData(params.categorySlug);
  if (!data) return { title: 'Ангилал олдсонгүй' };
  return {
    title: data.category.name,
    description: data.category.description || `${data.category.name} ангиллын бараанууд`,
  };
}

export default async function CategoryPage({
  params,
}: {
  params: { categorySlug: string };
}) {
  const data = await getCategoryData(params.categorySlug);

  if (!data) {
    notFound();
  }

  return (
    <Suspense fallback={<CategorySkeleton />}>
      <CategoryPageClient
        initialCategory={data.category}
        initialProducts={data.products}
        categorySlug={params.categorySlug}
      />
    </Suspense>
  );
}

function CategorySkeleton() {
  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="bg-slate-900 pt-32 pb-24 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="h-4 bg-white/10 rounded w-32 mb-8 animate-pulse" />
          <div className="h-16 bg-white/10 rounded-2xl w-64 mb-4 animate-pulse" />
          <div className="h-4 bg-white/10 rounded w-96 animate-pulse" />
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {Array(8).fill(0).map((_, i) => (
            <div key={i} className="bg-white rounded-[32px] overflow-hidden border border-slate-100">
              <div className="aspect-[4/5] bg-slate-100 animate-pulse" />
              <div className="p-5 space-y-3">
                <div className="h-3 bg-slate-100 rounded animate-pulse w-4/5" />
                <div className="h-3 bg-slate-100 rounded animate-pulse w-3/5" />
                <div className="flex justify-between items-center">
                  <div className="h-5 bg-slate-100 rounded animate-pulse w-20" />
                  <div className="w-10 h-10 bg-slate-100 rounded-xl animate-pulse" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
