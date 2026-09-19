-- Both vote functions are only ever called from the account page, which is
-- behind sign-in. A new function is executable by PUBLIC unless told otherwise,
-- so `grant ... to authenticated` alone left them reachable by anon over
-- /rest/v1/rpc. vote_for_area() already refuses a caller with no session, but
-- the door should not be open in the first place.

revoke execute on function public.vote_for_area(text) from public, anon;
grant execute on function public.vote_for_area(text) to authenticated;

revoke execute on function public.area_vote_tally() from public, anon;
grant execute on function public.area_vote_tally() to authenticated;
