import { createClient } from '@supabase/supabase-js'

// On utilise les noms de variables d'environnement standards de Next.js
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Le '!' à la fin indique à TypeScript que nous sommes sûrs que ces variables existeront.
// Vercel s'assurera de les fournir lors du build.

export const supabase = createClient(supabaseUrl, supabaseAnonKey)