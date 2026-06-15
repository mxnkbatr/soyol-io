'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ProductForm from '@/components/admin/ProductForm';
import { createProduct, ProductFormData } from '@/app/actions/products';
import { ArrowLeft, PackagePlus } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

export default function NewProductPage() {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (data: any) => {
        setIsSubmitting(true);

        // Convert string inputs to correct types as required by ProductFormData
        const payload: ProductFormData = {
            name: data.name,
            description: data.description,
            price: parseFloat(data.price) || 0,
            originalPrice: data.originalPrice ? parseFloat(data.originalPrice) : undefined,
            discountPercent: data.discountPercent ? parseFloat(data.discountPercent) : undefined,
            sections: data.sections || [],
            image: data.image || '',
            images: data.images || [],
            options: data.options || [],
            variants: data.variants || [],
            category: data.category,
            subcategory: data.subcategory || undefined,
            stockStatus: data.stockStatus || 'in-stock',
            inventory: parseInt(data.inventory) || 0,
            salesCount: parseInt(data.salesCount) || 0,
            shippingOrigin: data.shippingOrigin || undefined,
            shippingDestination: data.shippingDestination || undefined,
            dispatchTime: data.dispatchTime || undefined,
            sizeGuideUrl: data.sizeGuideUrl || undefined,
            featured: data.featured || false,
            isCargo: data.isCargo || false,
            brand: data.brand || '',
            model: data.model || '',
            delivery: data.delivery || 'Үнэгүй',
            deliveryFee: parseFloat(data.deliveryFee) || 0,
            paymentMethods: data.paymentMethods || 'QPay, SocialPay, Card',
            attributes: data.attributes || {}
        };

        // Next.js Server Actions do not support undefined values in objects
        Object.keys(payload).forEach((key) => {
            if (payload[key as keyof typeof payload] === undefined) {
                delete payload[key as keyof typeof payload];
            }
        });

        try {
            const result = await createProduct(payload);
            if (result.success) {
                toast.success('Бараа амжилттай нэмэгдлээ');
                router.push('/admin/products');
                router.refresh();
            } else {
                toast.error(result.error || 'Алдаа гарлаа');
            }
        } catch {
            toast.error('Сервертэй холбогдож чадсангүй');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex-1 flex flex-col min-h-screen bg-slate-950 text-white">
            {/* Header */}
            <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-xl sticky top-0 z-30">
                <div className="px-6 sm:px-8 py-5 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/admin/products" className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors">
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <div>
                            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">Шинэ бараа</h1>
                            <p className="text-xs text-slate-400 mt-1">Талбаруудыг бүрэн бөглөж барааг нийтлэнэ үү</p>
                        </div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20 hidden sm:flex">
                        <PackagePlus className="w-5 h-5 text-white" />
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 pb-8">
                <div className="max-w-7xl mx-auto">
                    <ProductForm onSubmit={handleSubmit} isSubmitting={isSubmitting} />
                </div>
            </main>
        </div>
    );
}
