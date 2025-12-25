import { createClient } from '@supabase/supabase-js';

// Access environment variables
// Note: If you created your app with Create React App (CRA), use process.env.REACT_APP_SUPABASE_URL instead
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// validation to ensure app doesn't crash silently
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

// Create the Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);