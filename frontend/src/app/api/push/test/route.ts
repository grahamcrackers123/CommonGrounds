import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { pushToUser } from '@/lib/push/send';

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const result = await pushToUser(user.id, 'test', {
    title: 'Test notification',
    body: 'Web push is working.',
  });
  return NextResponse.json(result);
}