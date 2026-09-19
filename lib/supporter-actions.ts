'use server';

import { revalidatePath } from 'next/cache';
import { createServerSupabase } from './supabase/server';

/**
 * A supporter's vote for the area we check next.
 *
 * Everything that matters is enforced in the database (migration 0033): you
 * must be signed in, you must be a supporter, the area must be one we cover,
 * and one vote per person per month replaces the last. This is only the form
 * handler, so a tampered request cannot vote twice or vote for somewhere made up.
 */
export async function voteForArea(formData: FormData): Promise<void> {
  const borough = String(formData.get('borough') ?? '').trim();
  if (!borough) return;

  const supabase = createServerSupabase();
  const { error } = await supabase.rpc('vote_for_area', { p_borough: borough });
  if (error) throw new Error(error.message);

  revalidatePath('/account');
}
