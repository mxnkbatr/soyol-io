'use client';

import { useState, useTransition } from 'react';
import { deleteProduct } from '@/app/actions/products';
import toast from 'react-hot-toast';
import { Trash2, Loader2, AlertCircle, Star } from 'lucide-react';
import Image from 'next/image';

type Product = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image: string | null;
  category: string;
  stockStatus: string;
  featured?: boolean;
  isCargo?: boolean;
  createdAt: Date;
};

export default function ProductInventoryTable({ products }: { products: Product[] }) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [featuredMap, setFeaturedMap] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {};
    products.forEach(p => { map[p.id] = !!p.featured; });
    return map;
  });
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const handleDelete = async (productId: string, productName: string) => {
    if (!confirm(`Are you sure you want to delete "${productName}"?`)) {
      return;
    }

    setDeletingId(productId);

    startTransition(async () => {
      const result = await deleteProduct(productId);

      if (result.success) {
        toast.success('Product deleted successfully', {
          icon: '🗑️',
          style: {
            borderRadius: '12px',
            background: '#EF4444',
            color: '#fff',
          },
        });
      } else {
        toast.error(result.error || 'Failed to delete product');
      }

      setDeletingId(null);
    });
  };

  const handleToggleFeatured = async (productId: string) => {
    const currentValue = featuredMap[productId] ?? false;
    const newValue = !currentValue;

    setTogglingId(productId);
    try {
      const res = await fetch(`/api/products/${productId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ featured: newValue }),
      });

      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        setFeaturedMap(prev => ({ ...prev, [productId]: newValue }));
        toast.success(
          newValue
            ? data.notificationSent
              ? 'Онцгой болголоо ⭐ — мэдэгдэл илгээгдлээ'
              : 'Онцгой болголоо ⭐'
            : 'Онцгой-оос хаслаа',
          { style: { borderRadius: '12px' } },
        );
      } else {
        toast.error('Алдаа гарлаа');
      }
    } catch {
      toast.error('Сервертэй холбогдож чадсангүй');
    } finally {
      setTogglingId(null);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('mn-MN', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      tech: 'Tech & Electronics',
      fashion: 'Fashion & Apparel',
      home: 'Home & Living',
      gaming: 'Gaming',
      beauty: 'Beauty & Personal Care',
      sports: 'Sports & Outdoors',
    };
    return labels[category] || category;
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { bg: string; text: string; label: string }> = {
      'in-stock': {
        bg: 'bg-green-50',
        text: 'text-green-700',
        label: 'In Stock',
      },
      'pre-order': {
        bg: 'bg-orange-50',
        text: 'text-orange-700',
        label: 'Pre-Order',
      },
      'out-of-stock': {
        bg: 'bg-red-50',
        text: 'text-red-700',
        label: 'Out of Stock',
      },
    };
    return badges[status] || badges['in-stock'];
  };

  if (products.length === 0) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-slate-900 mb-2">No products yet</h3>
        <p className="text-slate-600">Add your first product using the form on the left.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-200">
            <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Product</th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Category</th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Price</th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Status</th>
            <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700">Онцгой</th>
            <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Actions</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => {
            const statusBadge = getStatusBadge(product.stockStatus);
            const isDeleting = deletingId === product.id;

            return (
              <tr
                key={product.id}
                className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
              >
                {/* Product Column */}
                <td className="py-4 px-4">
                  <div className="flex items-center gap-3">
                    <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0">
                      {product.image ? (
                        <Image
                          src={product.image}
                          alt={product.name}
                          fill
                          className="object-cover"
                          sizes="48px"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400">
                          <AlertCircle className="w-5 h-5" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900 truncate">
                        {product.name} {product.isCargo && " + Карго"}
                      </p>
                      {product.description && (
                        <p className="text-sm text-slate-500 truncate max-w-xs">
                          {product.description}
                        </p>
                      )}
                    </div>
                  </div>
                </td>

                {/* Category Column */}
                <td className="py-4 px-4">
                  <span className="text-sm text-slate-600">
                    {getCategoryLabel(product.category)}
                  </span>
                </td>

                {/* Price Column */}
                <td className="py-4 px-4">
                  <span className="font-semibold text-slate-900">
                    ₮{formatPrice(product.price)}
                  </span>
                </td>

                {/* Status Column */}
                <td className="py-4 px-4">
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${statusBadge.bg} ${statusBadge.text}`}
                  >
                    {statusBadge.label}
                  </span>
                </td>

                {/* Featured Toggle */}
                <td className="py-4 px-4 text-center">
                  <button
                    onClick={() => handleToggleFeatured(product.id)}
                    disabled={togglingId === product.id}
                    className={`p-2 rounded-lg transition-all duration-200 ${featuredMap[product.id]
                        ? 'bg-amber-50 hover:bg-amber-100 text-amber-500'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-300 hover:text-slate-400'
                      } disabled:opacity-50`}
                    title={featuredMap[product.id] ? 'Онцгой-оос хасах' : 'Онцгой болгох'}
                  >
                    {togglingId === product.id ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Star
                        className={`w-5 h-5 ${featuredMap[product.id] ? 'fill-amber-400' : ''}`}
                      />
                    )}
                  </button>
                </td>

                {/* Actions Column */}
                <td className="py-4 px-4 text-right">
                  <button
                    onClick={() => handleDelete(product.id, product.name)}
                    disabled={isPending}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isDeleting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </>
                    )}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
