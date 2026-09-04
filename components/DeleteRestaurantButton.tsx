'use client';

import { deleteRestaurant } from '@/lib/admin-actions';
import { TrashIcon } from './icons';

export function DeleteRestaurantButton({ restaurantId }: { restaurantId: string }) {
  return (
    <button
      type="button"
      aria-label="Delete restaurant"
      title="Delete restaurant"
      onClick={() => {
        if (confirm('Delete this restaurant? This cannot be undone.')) {
          deleteRestaurant(restaurantId);
        }
      }}
      className="inline-flex h-9 w-9 items-center justify-center rounded-full text-halal-partialInk transition hover:bg-halal-partialSoft"
    >
      <TrashIcon className="h-[18px] w-[18px]" />
    </button>
  );
}
