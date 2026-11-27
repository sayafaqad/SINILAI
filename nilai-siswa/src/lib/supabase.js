import { createClient } from '@supabase/supabase-js';

// `import.meta.env` hanya ada di dalam build Vite. Penjaga ini membuat modul
// tetap bisa dimuat oleh skrip uji Node tanpa mengubah perilaku di peramban.
const env = import.meta.env || {};

const url = env.VITE_SUPABASE_URL;
const anonKey = env.VITE_SUPABASE_ANON_KEY;

export const supabase = url && anonKey ? createClient(url, anonKey) : null;
