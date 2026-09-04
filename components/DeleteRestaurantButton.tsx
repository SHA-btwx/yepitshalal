'use client';

import { deleteRestaurant } from '@/lib/admin-actions';

export function DeleteRestaurantButton({ restaurantId }: { restaurantId: string }) {
  return (
    <button
      onClick={() => {
        if (confirm('Delete this restaurant? This cannot be undone.')) {
          deleteRestaurant(restaurantId);
        }
      }}
      className="text-xs font-medium text-halal-partial hover:underline"
    >
      Delete
    </button>
  );
}
