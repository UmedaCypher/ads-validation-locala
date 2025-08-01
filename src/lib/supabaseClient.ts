import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.https://egmlrxouupgxyrbncrlb.supabase.co
const supabaseAnonKey = process.env.eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnbWxyeG91dXBneHlyYm5jcmxiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM4NzE3NjksImV4cCI6MjA2OTQ0Nzc2OX0.ie8h25l7j59fJyYPF4fA-DloQ4AfEY0dN7Mo3j5WaOg

export const supabase = createClient(supabaseUrl, supabaseAnonKey)