// This is the server component (page.tsx)
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Dashboard from './Dashboard';

export const metadata = {
  title: 'Cold Call Tracker',
  description: 'Track and manage your cold calls efficiently'
};

export default async function Home() {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return redirect('/login')
  }

  const { data: businesses, error } = await supabase
    .from('businesses')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching businesses:', error);
    // Optionally render an error state
  }

  return <Dashboard initialBusinesses={businesses || []} />;
}
