
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables. Please check your .env file.');
  // Prevent crash, but app won't work correctly. 
  // We can return a mock/dummy to allow UI to render error message instead of white/blue screen of death.
}

console.log('Supabase URL:', supabaseUrl ? 'Defined' : 'Missing');
console.log('Supabase Key:', supabaseAnonKey ? 'Defined' : 'Missing');

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');
