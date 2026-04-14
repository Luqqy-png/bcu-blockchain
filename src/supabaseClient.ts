// sets up the Supabase client used across the whole frontend
// using the anon key here which is safe to expose in the browser
// the backend uses a separate service role key for anything that needs to bypass RLS

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://plarqjhvyepfkhxxpmrc.supabase.co'

// had to hardcode this because Vite wasn't picking up the env variable properly
// the anon key is public-facing so this is fine
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY

export const supabase = createClient(supabaseUrl, supabaseKey)
