'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export function PhotoUploader({ restaurantId }: { restaurantId: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setUploading(true);
    setError(null);
    const supabase = createClient();
    const path = `${restaurantId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.\-_]/g, '')}`;

    const { error: uploadError } = await supabase.storage.from('restaurant-photos').upload(path, file);
    if (uploadError) {
      setUploading(false);
      setError(uploadError.message);
      return;
    }

    const { data } = supabase.storage.from('restaurant-photos').getPublicUrl(path);
    const { error: insertError } = await supabase.from('restaurant_photos').insert({
      restaurant_id: restaurantId,
      storage_path: data.publicUrl,
      type: 'food',
    });

    setUploading(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    router.refresh();
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
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
        className="rounded-full border border-black/15 px-3.5 py-1.5 text-xs font-semibold text-ink hover:border-ink/40 disabled:opacity-60"
      >
        {uploading ? 'Uploading…' : '+ Upload photo'}
      </button>
      {error && <p className="mt-1 text-xs text-halal-partial">{error}</p>}
    </div>
  );
}
