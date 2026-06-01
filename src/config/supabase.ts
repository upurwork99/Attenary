import { createClient } from '@supabase/supabase-js';

export const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co';
export const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});

export const createSupabaseClient = (clerkToken: string | null) => {
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: clerkToken ? `Bearer ${clerkToken}` : '',
      },
    },
  });
};
