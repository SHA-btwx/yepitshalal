'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { finalizeUploadedReel } from '@/lib/reel-actions';
import { PlusIcon } from './icons';

/**
 * Two-step upload: the server mints a signed URL only after it has checked
 * ownership and allowance, then the file goes straight from the browser to
 * storage. The video never passes through a serverless function — a 100 MB
 * body through a route handler is exactly how you hit a platform limit.
 */
export function ReelUploader({
  restaurantId,
  disabled,
  disabledReason,
}: {
  restaurantId: string;
  disabled?: boolean;
  disabledReason?: string;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);

  async function handleFile(file: File) {
    setBusy(true);
    setError(null);
    setProgress('Checking your allowance…');

    try {
      const res = await fetch('/api/reels/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurantId,
          fileName: file.name,
          contentType: file.type,
          size: file.size,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Could not start the upload.');

      setProgress('Uploading…');
      const supabase = createClient();
      const { error: uploadError } = await supabase.storage
        .from(json.bucket)
        .uploadToSignedUrl(json.path, json.token, file);
      if (uploadError) throw new Error(uploadError.message);

      setProgress('Sending for review…');
      const form = new FormData();
      form.set('media_url', json.publicUrl);
      await finalizeUploadedReel(restaurantId, form);

      setProgress(null);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
      setProgress(null);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="video/mp4,video/quicktime,video/webm"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy || disabled}
        title={disabled ? disabledReason : undefined}
        className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-ink px-5 text-sm font-semibold text-white transition hover:bg-accent-ink disabled:opacity-50"
      >
        <PlusIcon className="h-4 w-4" />
        {busy ? (progress ?? 'Working…') : 'Upload a reel'}
      </button>

      {disabled && disabledReason && !error && (
        <p className="mt-2 text-xs text-muted">{disabledReason}</p>
      )}
      {error && (
        <p role="alert" className="mt-2 text-xs font-medium text-halal-partialInk">
          {error}
        </p>
      )}
    </div>
  );
}
