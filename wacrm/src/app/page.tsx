// src/app/page.tsx
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { db } from '@/lib/db';

export default async function HomePage() {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const dbUser = await db.user.findUnique({ where: { supabaseId: user.id } });
  if (!dbUser) redirect('/onboarding');

  redirect('/dashboard/inbox');
}
