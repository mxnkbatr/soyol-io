'use client';

import { useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { UploadCloud, Loader2, ImagePlus, Camera } from 'lucide-react';
import toast from 'react-hot-toast';
import { uploadAdminImageFile, uploadAdminImageFiles } from '@/lib/uploadClient';
import { pickAndUploadImage } from '@/lib/upload';

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
  const isNative = Capacitor.isNativePlatform();

  const applyUrl = (url: string) => {
    if (onAdd) {
      onAdd(url);
    } else if (onChange) {
      onChange(url);
    }
  };

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
        urls.forEach((url) => applyUrl(url));
      } else if (onChange) {
        const { url } = await uploadAdminImageFile(list[0], folder);
        onChange(url);
      }
      toast.success('Зураг амжилттай хуулагдлаа');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload алдаа');
    } finally {
      setIsUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleNativeGallery = async () => {
    setIsUploading(true);
    try {
      const url = await pickAndUploadImage({ folder, source: 'gallery' });
      if (url) {
        applyUrl(url);
        toast.success('Зураг амжилттай хуулагдлаа');
      }
    } catch {
      toast.error('Зураг хуулахад алдаа гарлаа');
    } finally {
      setIsUploading(false);
    }
  };

  const handleNativeCamera = async () => {
    setIsUploading(true);
    try {
      const url = await pickAndUploadImage({ folder, source: 'camera' });
      if (url) {
        applyUrl(url);
        toast.success('Зураг амжилттай хуулагдлаа');
      }
    } catch {
      toast.error('Зураг хуулахад алдаа гарлаа');
    } finally {
      setIsUploading(false);
    }
  };

  const isDark = variant === 'dark';
  const buttonClass = isDark
    ? 'w-full min-h-[120px] py-8 bg-slate-950 border-2 border-dashed border-slate-800 rounded-2xl flex flex-col items-center justify-center gap-3 text-slate-500 hover:text-amber-500 hover:border-amber-500/50 hover:bg-amber-500/5 transition-all group disabled:opacity-60 touch-manipulation active:scale-[0.99]'
    : 'w-full min-h-[52px] flex items-center justify-center gap-3 px-4 py-3.5 bg-gray-50 border-2 border-dashed border-gray-200 hover:border-orange-400 hover:bg-orange-50 cursor-pointer rounded-xl transition-all disabled:opacity-60 touch-manipulation';

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple={multiple}
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {isNative ? (
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={disabled || isUploading}
            onClick={handleNativeGallery}
            className={buttonClass}
          >
            {isUploading ? (
              <Loader2 className={`w-6 h-6 animate-spin ${isDark ? 'text-amber-500' : 'text-orange-500'}`} />
            ) : (
              <ImagePlus className="w-6 h-6" />
            )}
            <span className="text-xs font-bold text-center">{isUploading ? 'Хуулж байна...' : 'Галерей'}</span>
          </button>
          <button
            type="button"
            disabled={disabled || isUploading}
            onClick={handleNativeCamera}
            className={buttonClass}
          >
            <Camera className="w-6 h-6" />
            <span className="text-xs font-bold">Камер</span>
          </button>
        </div>
      ) : (
        <button
          type="button"
          disabled={disabled || isUploading}
          onClick={() => inputRef.current?.click()}
          className={buttonClass}
        >
          {isUploading ? (
            <>
              <Loader2 className={`w-5 h-5 animate-spin ${isDark ? 'text-amber-500' : 'text-orange-500'}`} />
              <span className="text-sm font-medium">Хуулж байна...</span>
            </>
          ) : showPreview && value && !isDark ? (
            <div className="flex items-center gap-3 w-full px-2">
              <img src={value} alt="Preview" className="w-12 h-12 object-cover rounded-lg border border-gray-200" />
              <span className="text-sm font-medium text-gray-700 truncate">{label}</span>
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
      )}
    </div>
  );
}
