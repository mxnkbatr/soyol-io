'use client';

import { CldUploadWidget } from 'next-cloudinary';
import { ImagePlus, Trash, GripVertical, Star } from 'lucide-react';
import Image from 'next/image';
import { useCallback, useState } from 'react';

interface MultiImageUploadProps {
    disabled?: boolean;
    onChange: (value: string[] | ((prev: string[]) => string[])) => void;
    value: string[];
}

const MultiImageUpload: React.FC<MultiImageUploadProps> = ({
    disabled,
    onChange,
    value
}) => {
    const onUpload = useCallback((result: any) => {
        if (result.info && result.info.secure_url) {
            onChange((prev) => [...prev, result.info.secure_url]);
        }
    }, [onChange]);

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
                        <div key={url} className={`relative aspect-square rounded-xl overflow-hidden border ${index === 0 ? 'border-amber-500 ring-2 ring-amber-500/30' : 'border-white/10'} group`}>
                            {/* Actions Overlay */}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity z-10 
                                            flex items-center justify-center gap-2">
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

                            {/* Primary Badge */}
                            {index === 0 && (
                                <div className="absolute top-2 left-2 z-10 bg-amber-500 text-slate-950 text-[10px] font-bold px-2 py-1 rounded-md shadow-lg flex items-center gap-1">
                                    <Star className="w-3 h-3 fill-current" /> Үндсэн
                                </div>
                            )}

                            <Image
                                fill
                                className="object-cover"
                                alt="Image"
                                src={url}
                                sizes="200px"
                            />
                        </div>
                    ))}
                </div>
            )}

            <CldUploadWidget
                onSuccess={onUpload}
                uploadPreset="Buddha"
                options={{
                    maxFiles: 10,
                    clientAllowedFormats: ['png', 'jpeg', 'webp', 'jpg'],
                    maxImageWidth: 2000,
                    maxImageHeight: 2000,
                    sources: ['local', 'url', 'camera']
                }}
            >
                {({ open }) => {
                    const onClick = () => {
                        open();
                    };

                    return (
                        <button
                            type="button"
                            disabled={disabled}
                            onClick={onClick}
                            className="w-full px-4 py-8 bg-slate-800/50 border border-white/10 border-dashed rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 hover:border-amber-500/50 transition-all flex flex-col items-center justify-center gap-2"
                        >
                            <ImagePlus className="h-8 w-8 mb-2" />
                            <span className="text-sm font-medium">{value && value.length > 0 ? 'Нэмэлт зураг оруулах' : 'Зураг оруулах'}</span>
                            <span className="text-xs text-slate-500">Олон зураг зэрэг сонгож болно (Max 10)</span>
                        </button>
                    );
                }}
            </CldUploadWidget>
        </div>
    );
}

export default MultiImageUpload;
