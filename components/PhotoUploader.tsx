'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { addRestaurantPhoto } from '@/lib/admin-actions';
import { PlusIcon } from './icons';

// Admin only. The browser no longer writes to storage or the photos table on
// its own authority: the server issues a signed upload URL after checking the
// admin, and records the photo in a server action.
export function PhotoUploader({ restaurantId }: { restaurantId: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setUploading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/photo-upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restaurantId, contentType: file.type, fileName: file.name, size: file.size }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Could not start the upload.');

      const supabase = createClient();
      const { error: uploadError } = await supabase.storage
        .from('restaurant-photos')
        .uploadToSignedUrl(json.path, json.token, file, { contentType: file.type });
      if (uploadError) throw new Error(uploadError.message);

      await addRestaurantPhoto(restaurantId, json.path);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="text-right">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full border border-line bg-white px-3.5 text-xs font-semibold text-ink transition hover:border-ink/30 disabled:opacity-60"
      >
        <PlusIcon className="h-3.5 w-3.5" />
        {uploading ? 'Uploading…' : 'Upload photo'}
      </button>
      {error && (
        <p role="alert" className="mt-1 text-xs font-medium text-halal-partialInk">
          {error}
        </p>
      )}
    </div>
  );
}
