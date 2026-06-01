'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/context/AuthContext';
import { toast } from 'react-hot-toast';

interface RestockNotifyButtonProps {
  productId: string;
}

export default function RestockNotifyButton({ productId }: RestockNotifyButtonProps) {
  const { isSignedIn } = useUser();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [requested, setRequested] = useState(false);

  const handleNotify = async () => {
    if (!isSignedIn) {
      router.push('/sign-in');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/products/${productId}/notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (res.ok) {
        setRequested(true);
        toast.success('Бараа ирэхэд мэдэгдэнэ!');
      } else {
        toast.error('Мэдэгдэл бүртгэхэд алдаа гарлаа.');
      }
    } catch (error) {
      console.error('Failed to register restock watcher:', error);
      toast.error('Сервертэй холбогдоход алдаа гарлаа.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleNotify}
      disabled={loading || requested}
      className={`w-full py-3.5 px-6 rounded-full font-bold text-[15px] transition-all flex items-center justify-center gap-2 ${
        requested
          ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
          : 'bg-[#1C1C1E] text-white hover:bg-black active:scale-[0.98]'
      }`}
    >
      {loading ? (
        <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
      ) : requested ? (
        '✓ Мэдэгдэл бүртгэгдлээ'
      ) : (
        '🔔 Бэлэн болоход мэдэгдүүл'
      )}
    </button>
  );
}