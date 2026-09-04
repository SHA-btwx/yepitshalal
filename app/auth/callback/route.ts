import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';

// Supabase magic-link redirect target: exchanges the emailed code for a
// session cookie, then sends the user on to wherever they were headed.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') || '/';

  if (code) {
    const supabase = createServerSupabase();
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
