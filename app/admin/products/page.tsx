"use client";

import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import {
  Package,
  PlusCircle,
  Pencil,
  Trash2,
  Loader2,
  ArrowLeft,
  Search,
  Filter,
  Star,
  AlertCircle,
} from "lucide-react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { formatPrice } from "@/lib/utils";
import { deleteProduct } from "@/app/actions/products";

const fetcher = (url: string) =>
  fetch(url, { cache: "no-store" }).then((r) => r.json());

export default function AdminProductsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [togglingFeatured, setTogglingFeatured] = useState<string | null>(null);
  const [editingStock, setEditingStock] = useState<{
    id: string;
    value: string;
  } | null>(null);

  const { data: productsData, mutate: mutateProducts } = useSWR(
    "/api/products?admin=true",
    fetcher,
  );
  const { data: categoriesData } = useSWR("/api/categories", fetcher);

  const products = productsData?.products || [];
  const categories = categoriesData?.categories || [];
  const loading = !productsData;

  const searchParams = useSearchParams();
  const urlFilter = searchParams.get("filter"); // 'low-stock' | null

  const filteredProducts = products.filter((product: any) => {
    const matchesSearch = product.name
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesCategory =
      filterCategory === "all" || product.category === filterCategory;
    const matchesLowStock =
      urlFilter !== "low-stock" || (product.inventory || 0) < 5;
    return matchesSearch && matchesCategory && matchesLowStock;
  });

  const handleDelete = async (id: string) => {
    // Custom confirm dialog logic could be added here later
    if (!window.confirm("Энэ барааг устгах уу? Энэ үйлдэл буцаагдахгүй."))
      return;

    try {
      const result = await deleteProduct(id);
      if (result.success) {
        toast.success("Бараа устгагдлаа");
        mutateProducts();
      } else {
        toast.error(result.error || "Алдаа гарлаа");
      }
    } catch {
      toast.error("Сервертэй холбогдож чадсангүй");
    }
  };

  const handleToggleFeatured = async (product: any) => {
    const newValue = !product.featured;
    setTogglingFeatured(product._id);
    try {
      const res = await fetch(`/api/products/${product._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ featured: newValue }),
      });
      if (res.ok) {
        mutateProducts((currentData: any) => {
          if (!currentData || !currentData.products) return currentData;
          return {
            ...currentData,
            products: currentData.products.map((p: any) =>
              p._id === product._id ? { ...p, featured: newValue } : p,
            ),
          };
        }, false);
        toast.success(newValue ? "Онцгой болголоо ⭐" : "Онцгой-оос хаслаа");
        // Note: нүүр хуудасны carousel дараагийн 60 секундын дараа автоматаар шинэчлэгдэнэ
        // (Cache-Control: s-maxage=60). Яаралтай шинэчлэх шаардлагагүй.
      } else {
        toast.error("Алдаа гарлаа");
      }
    } catch {
      toast.error("Сервертэй холбогдож чадсангүй");
    } finally {
      setTogglingFeatured(null);
    }
  };

  const handleStockUpdate = async (productId: string, newInventory: number) => {
    try {
      const res = await fetch(`/api/products/${productId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inventory: newInventory }),
      });
      if (res.ok) {
        mutateProducts();
        toast.success("Нөөц шинэчлэгдлээ");
      } else {
        toast.error("Алдаа гарлаа");
      }
    } catch {
      toast.error("Сервертэй холбогдож чадсангүй");
    } finally {
      setEditingStock(null);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-xl sticky top-0 z-30">
        <div className="px-6 sm:px-8 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/admin"
              className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors hidden sm:block"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                Бүтээгдэхүүн{" "}
                <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full text-xs font-medium">
                  {products.length}
                </span>
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                Жагсаалт, хайлт, устгах зэрэг үйлдлүүд
              </p>
            </div>
          </div>
          <Link
            href="/admin/products/new"
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-slate-950 rounded-xl hover:bg-amber-400 transition-colors font-bold shadow-lg shadow-amber-500/20 text-sm"
          >
            <PlusCircle className="w-4 h-4" />
            <span className="hidden sm:inline">Бараа нэмэх</span>
            <span className="sm:hidden">Нэмэх</span>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6 pb-6">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 items-center bg-slate-900 p-4 rounded-xl border border-slate-800 shadow-sm">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              id="admin-search"
              type="text"
              placeholder="Бараа хайх... ( ' / ' дарж идэвхжүүлнэ )"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 text-sm transition-all"
            />
          </div>

          <div className="w-px h-6 bg-slate-800 hidden sm:block" />

          <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0 scrollbar-hide">
            <Filter className="w-4 h-4 text-slate-500 hidden sm:block shrink-0" />
            <button
              onClick={() => setFilterCategory("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${filterCategory === "all" ? "bg-amber-500 text-slate-950" : "bg-slate-800 text-slate-400 hover:text-white"}`}
            >
              Ангилал бүгд
            </button>
            {categories.map((cat: any, index: number) => (
              <button
                key={cat._id || cat.id || `cat-${index}`}
                onClick={() => setFilterCategory(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${filterCategory === cat.id ? "bg-amber-500 text-slate-950" : "bg-slate-800 text-slate-400 hover:text-white"}`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* List */}

        {/* MOBILE CARD LIST — md-с дээш нуугдана */}
        <div className="md:hidden space-y-3">
          {loading ? (
            <div className="py-12 text-center">
              <Loader2 className="w-6 h-6 animate-spin text-amber-500 mx-auto" />
            </div>
          ) : (
            filteredProducts.map((product: any) => (
              <div
                key={product._id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-4"
              >
                <div className="flex gap-3 items-start">
                  <div className="w-14 h-14 rounded-xl overflow-hidden bg-slate-800 border border-slate-700 shrink-0">
                    {product.image && (
                      <img
                        src={product.image}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-white text-sm leading-tight line-clamp-2">
                      {product.name} {product.isCargo && " + Карго"}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {product.category}
                    </p>
                    <p className="font-black text-amber-500 text-sm mt-1">
                      {formatPrice(product.price)}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1.5 shrink-0">
                    <Link
                      href={`/admin/products/${product._id}`}
                      className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors"
                    >
                      <Pencil className="w-4 h-4" />
                    </Link>
                    <button
                      onClick={() => handleDelete(product._id)}
                      className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-800">
                  <span
                    className={`text-[10px] font-bold px-2 py-1 rounded-lg ${product.stockStatus === "in-stock" ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"}`}
                  >
                    {product.stockStatus === "in-stock"
                      ? "● Бэлэн"
                      : "○ Захиалга"}
                  </span>
                  <span
                    onClick={() =>
                      setEditingStock({
                        id: product._id,
                        value: String(product.inventory || 0),
                      })
                    }
                    className="text-xs text-slate-400 ml-auto cursor-pointer hover:text-amber-400 touch-manipulation"
                  >
                    {editingStock?.id === product._id && editingStock ? (
                      <input
                        type="number"
                        inputMode="numeric"
                        value={editingStock.value}
                        onChange={(e) =>
                          setEditingStock({
                            id: product._id,
                            value: e.target.value,
                          })
                        }
                        onBlur={() =>
                          handleStockUpdate(
                            product._id,
                            parseInt(editingStock.value) || 0,
                          )
                        }
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleStockUpdate(
                              product._id,
                              parseInt(editingStock.value) || 0,
                            );
                          }
                        }}
                        className="w-14 bg-slate-800 text-white text-xs rounded px-2 py-1 text-center"
                        autoFocus
                      />
                    ) : (
                      <>Үлд: {product.inventory ?? 0}ш ✎</>
                    )}
                  </span>
                  <button
                    onClick={() => handleToggleFeatured(product)}
                    disabled={togglingFeatured === product._id}
                    className={`ml-auto text-xs font-bold px-2 py-1 rounded-lg transition-colors ${product.featured ? "bg-amber-500/20 text-amber-400" : "bg-slate-800 text-slate-500"}`}
                  >
                    {togglingFeatured === product._id ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : product.featured ? (
                      "⭐ Онцгой"
                    ) : (
                      "Онцгой болгох"
                    )}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* DESKTOP TABLE — mobile-д нуугдана */}
        <div className="hidden md:block bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-950/50 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                  <th className="px-6 py-4">Зураг</th>
                  <th className="px-6 py-4">Нэр & Ангилал</th>
                  <th className="px-6 py-4">Үнэ</th>
                  <th className="px-6 py-4">Үлдэгдэл</th>
                  <th className="px-6 py-4 text-center">Онцгой</th>
                  <th className="px-6 py-4 text-right">Үйлдэл</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-20 text-center">
                      <Loader2 className="w-8 h-8 text-amber-500 animate-spin mx-auto" />
                      <p className="text-slate-500 text-sm mt-4">
                        Ачаалж байна...
                      </p>
                    </td>
                  </tr>
                ) : filteredProducts.length > 0 ? (
                  filteredProducts.map((p: any) => (
                    <tr
                      key={p._id}
                      className="hover:bg-slate-800/30 transition-colors group"
                    >
                      <td className="px-6 py-4">
                        <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-slate-800 ring-1 ring-slate-700">
                          {p.image ? (
                            <Image
                              src={p.image}
                              alt=""
                              fill
                              className="object-cover"
                              sizes="48px"
                            />
                          ) : (
                            <Package className="w-5 h-5 text-slate-600 absolute inset-0 m-auto" />
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Link
                          href={`/admin/products/${p._id}`}
                          className="text-sm font-bold text-white hover:text-amber-400 transition-colors line-clamp-1"
                        >
                          {p.name} {p.isCargo && " + Карго"}
                        </Link>
                        <div className="text-xs text-slate-500 mt-1">
                          {categories.find((c: any) => c.id === p.category)
                            ?.name || p.category}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-amber-400 font-bold text-sm">
                          {formatPrice(p.price)}
                        </span>
                        {p.originalPrice && p.originalPrice > p.price && (
                          <span className="ml-2 text-xs text-slate-500 line-through">
                            {formatPrice(p.originalPrice)}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {editingStock?.id === p._id ? (
                            <input
                              type="number"
                              value={editingStock!.value}
                              onChange={(e) =>
                                setEditingStock({
                                  id: p._id,
                                  value: e.target.value,
                                })
                              }
                              onBlur={() =>
                                handleStockUpdate(
                                  p._id,
                                  parseInt(editingStock!.value) || 0,
                                )
                              }
                              onKeyDown={(e) =>
                                e.key === "Enter" &&
                                handleStockUpdate(
                                  p._id,
                                  parseInt(editingStock!.value) || 0,
                                )
                              }
                              className="w-16 bg-slate-700 text-white text-sm rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-amber-500"
                              autoFocus
                            />
                          ) : (
                            <>
                              <span
                                onClick={() =>
                                  setEditingStock({
                                    id: p._id,
                                    value: String(p.inventory || 0),
                                  })
                                }
                                className={`cursor-pointer hover:text-amber-400 transition-colors text-sm font-bold ${(p.inventory || 0) < 5 ? "text-red-400" : "text-slate-300"}`}
                              >
                                {p.inventory || 0}ш
                              </span>
                              {(p.inventory || 0) < 5 && (
                                <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                              )}
                            </>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => handleToggleFeatured(p)}
                          disabled={togglingFeatured === p._id}
                          className={`p-2 rounded-lg transition-all duration-200 ${p.featured ? "bg-amber-500/20 text-amber-500 hover:bg-amber-500/30" : "bg-slate-800 text-slate-500 hover:text-slate-300 hover:bg-slate-700"} disabled:opacity-50`}
                          title={
                            p.featured ? "Онцгой-оос хасах" : "Онцгой болгох"
                          }
                        >
                          {togglingFeatured === p._id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Star
                              className={`w-4 h-4 ${p.featured ? "fill-amber-500" : ""}`}
                            />
                          )}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 transition-all">
                          <Link
                            href={`/admin/products/${p._id}`}
                            className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-all font-medium text-xs flex items-center gap-1"
                            title="Засах"
                          >
                            <Pencil className="w-4 h-4" />
                            <span className="hidden xl:inline">Засах</span>
                          </Link>
                          <button
                            onClick={() => handleDelete(p._id)}
                            className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all font-medium text-xs flex items-center gap-1"
                            title="Устгах"
                          >
                            <Trash2 className="w-4 h-4" />
                            <span className="hidden xl:inline">Устгах</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-20 text-center">
                      <div className="w-16 h-16 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Search className="w-6 h-6 text-slate-500" />
                      </div>
                      <h3 className="text-lg font-bold text-white mb-1">
                        Бараа олдсонгүй
                      </h3>
                      <p className="text-slate-500 text-sm">
                        Хайлтын утга эсвэл ангиллаа өөрчилж үзнэ үү.
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
