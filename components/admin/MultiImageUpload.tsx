'use client';

import { ImagePlus, Trash, Star } from 'lucide-react';
import Image from 'next/image';
import AdminImageUpload from '@/components/admin/AdminImageUpload';

interface MultiImageUploadProps {
  disabled?: boolean;
  onChange: (value: string[] | ((prev: string[]) => string[])) => void;
  value: string[];
}

const MultiImageUpload: React.FC<MultiImageUploadProps> = ({ disabled, onChange, value }) => {
  const onRemove = (urlToRemove: string) => {
    onChange((prev) => prev.filter((url) => url !== urlToRemove));
  };

  const setAsPrimary = (urlToPrimary: string) => {
    onChange((prev) => {
      const filtered = prev.filter((url) => url !== urlToPrimary);
      return [urlToPrimary, ...filtered];
    });
  };

  return (
    <div>
      {value && value.length > 0 && (
        <div className="mb-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {value.map((url, index) => (
            <div
              key={url}
              className={`relative aspect-square rounded-xl overflow-hidden border ${index === 0 ? 'border-amber-500 ring-2 ring-amber-500/30' : 'border-white/10'} group`}
            >
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity z-10 flex items-center justify-center gap-2">
                {index !== 0 && (
                  <button
                    type="button"
                    onClick={() => setAsPrimary(url)}
                    className="p-2 bg-slate-800 rounded-lg text-white hover:bg-amber-500 transition shadow-lg"
                    title="Үндсэн зураг болгох"
                  >
                    <Star className="h-4 w-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onRemove(url)}
                  className="p-2 bg-red-500 rounded-lg text-white hover:bg-red-600 transition shadow-lg"
                  title="Устгах"
                >
                  <Trash className="h-4 w-4" />
                </button>
              </div>

              {index === 0 && (
                <div className="absolute top-2 left-2 z-10 bg-amber-500 text-slate-950 text-[10px] font-bold px-2 py-1 rounded-md shadow-lg flex items-center gap-1">
                  <Star className="w-3 h-3 fill-current" /> Үндсэн
                </div>
              )}

              <Image fill className="object-cover" alt="Image" src={url} sizes="200px" />
            </div>
          ))}
        </div>
      )}

      <AdminImageUpload
        disabled={disabled}
        folder="products"
        multiple
        onAdd={(url) => onChange((prev) => [...prev, url])}
        variant="dark"
        label={value?.length ? 'Нэмэлт зураг оруулах' : 'Зураг оруулах'}
        sublabel="Шинэ Cloudinary · олон зураг сонгож болно"
        showPreview={false}
      />
    </div>
  );
};

export default MultiImageUpload;
