'use client';

export async function uploadAdminImageFile(
  file: File,
  folder: 'banners' | 'products' = 'products',
): Promise<{ url: string; source: string }> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('folder', folder);

  const res = await fetch('/api/upload/image', {
    method: 'POST',
    body: formData,
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Upload алдаа');
  }

  return { url: data.url, source: data.source };
}

export async function uploadAdminImageFiles(
  files: File[],
  folder: 'banners' | 'products' = 'products',
): Promise<string[]> {
  const urls: string[] = [];
  for (const file of files) {
    const { url } = await uploadAdminImageFile(file, folder);
    urls.push(url);
  }
  return urls;
}
