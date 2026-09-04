export function RestaurantCardSkeleton() {
  return (
    <div className="flex animate-pulse gap-3 rounded-2xl bg-white p-2.5 shadow-sm ring-1 ring-black/5 sm:flex-col sm:p-0 sm:overflow-hidden">
      <div className="h-20 w-20 shrink-0 rounded-xl bg-black/5 sm:h-40 sm:w-full sm:rounded-none" />
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-2 sm:p-3.5">
        <div className="h-4 w-3/4 rounded bg-black/10" />
        <div className="h-3 w-1/2 rounded bg-black/5" />
        <div className="h-4 w-20 rounded-full bg-black/5" />
      </div>
    </div>
  );
}
