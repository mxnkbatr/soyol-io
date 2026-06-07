'use client';

import { useRef, useState } from 'react';
import { UploadCloud, Loader2, ImagePlus } from 'lucide-react';
import toast from 'react-hot-toast';
import { uploadAdminImageFile, uploadAdminImageFiles } from '@/lib/uploadClient';

type Props = {
  value?: string;
  onChange?: (url: string) => void;
  onAdd?: (url: string) => void;
  folder?: 'banners' | 'products';
  multiple?: boolean;
  disabled?: boolean;
  variant?: 'light' | 'dark';
  label?: string;
  sublabel?: string;
  showPreview?: boolean;
};

export default function AdminImageUpload({
  value = '',
  onChange,
  onAdd,
  folder = 'products',
  multiple = false,
  disabled = false,
  variant = 'light',
  label = 'Зураг сонгох',
  sublabel,
  showPreview = true,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return;

    const list = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (!list.length) {
      toast.error('Зөвхөн зураг файл');
      return;
    }

    for (const file of list) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name}: хэт том (max 10MB)`);
        return;
      }
    }

    setIsUploading(true);
    try {
      if (multiple || onAdd) {
        const urls = await uploadAdminImageFiles(list, folder);
        if (onAdd) {
          urls.forEach((url) => onAdd(url));
        } else if (onChange && urls[0]) {
          onChange(urls[0]);
        }
      } else if (onChange) {
        const { url } = await uploadAdminImageFile(list[0], folder);
        onChange(url);
      }
      toast.success('Зураг амжилттай хуулагдлаа (шинэ Cloudinary)');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload алдаа');
    } finally {
      setIsUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const isDark = variant === 'dark';
  const buttonClass = isDark
    ? 'w-full py-12 bg-slate-950 border-2 border-dashed border-slate-800 rounded-2xl flex flex-col items-center justify-center gap-3 text-slate-500 hover:text-amber-500 hover:border-amber-500/50 hover:bg-amber-500/5 transition-all group disabled:opacity-60'
    : 'w-full flex items-center justify-center gap-3 px-4 py-3.5 bg-gray-50 border-2 border-dashed border-gray-200 hover:border-orange-400 hover:bg-orange-50 cursor-pointer rounded-xl transition-all disabled:opacity-60';

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple={multiple}
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <button
        type="button"
        disabled={disabled || isUploading}
        onClick={() => inputRef.current?.click()}
        className={buttonClass}
      >
        {isUploading ? (
          <>
            <Loader2 className={`w-5 h-5 animate-spin ${isDark ? 'text-amber-500' : 'text-orange-500'}`} />
            <span className="text-sm font-medium">Шинэ Cloudinary руу хуулж байна...</span>
          </>
        ) : showPreview && value && !isDark ? (
          <div className="flex items-center gap-3 w-full">
            <img src={value} alt="Preview" className="w-12 h-12 object-cover rounded-lg border border-gray-200" />
            <span className="text-sm font-medium text-gray-700 truncate">{value}</span>
          </div>
        ) : isDark ? (
          <>
            <div className="p-4 bg-slate-900 rounded-full group-hover:bg-amber-500/10 transition-colors">
              <ImagePlus className="w-8 h-8" />
            </div>
            <span className="font-bold">{label}</span>
            {sublabel && (
              <span className="text-[10px] uppercase tracking-widest opacity-60">{sublabel}</span>
            )}
          </>
        ) : (
          <>
            <UploadCloud className="w-5 h-5 text-gray-400" />
            <span className="text-sm font-medium text-gray-500">{label}</span>
          </>
        )}
      </button>
    </>
  );
}
