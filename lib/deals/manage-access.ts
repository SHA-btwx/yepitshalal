import { notFound, redirect } from 'next/navigation';
import { createServerSupabase } from '@/lib/supabase/server';
import { dealsDb } from '@/lib/deals/db';
import { statusFor } from '@/lib/halalPages';
import type { HalalStatus } from '@/lib/types';

export interface ManagedRestaurant {
  id: string;
  name: string;
  slug: string;
  label: HalalStatus | null;
  isListed: boolean;
}

/**
 * The page side of requireRestaurantAccess: the restaurant's owner, or an
 * admin. Anyone else gets a 404, so the page does not even confirm the
 * restaurant can be managed. Signed out goes to sign in and comes back.
 */
export async function managedRestaurant(slug: string, page: 'deals' | 'poster') {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/sign-in?next=/manage/${slug}/${page}`);

  const admin = dealsDb();
  const { data: r } = await admin
    .from('restaurants')
    .select('id, name, slug, branch_label, owner_id, halal_classification, is_listed, is_searchable')
    .eq('slug', slug)
    .maybeSingle();
  if (!r) notFound();

  const { data: profile } = await admin.from('users').select('role').eq('id', user.id).maybeSingle();
  const isAdmin = profile?.role === 'admin';
  if (r.owner_id !== user.id && !isAdmin) notFound();

  const restaurant: ManagedRestaurant = {
    id: r.id,
    name: r.branch_label ? `${r.name}, ${r.branch_label}` : r.name,
    slug: r.slug,
    label: statusFor({ isListed: !!r.is_listed, isSearchable: !!r.is_searchable, halal_classification: r.halal_classification }),
    isListed: !!r.is_listed,
  };
  return { user, isAdmin, restaurant };
}
