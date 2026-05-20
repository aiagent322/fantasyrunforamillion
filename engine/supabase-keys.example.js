/**
 * Fantasy Run For A Million — Supabase Keys (Example)
 * =====================================================
 * SETUP INSTRUCTIONS:
 *
 * 1. Copy this file:
 *      cp engine/supabase-keys.example.js engine/supabase-keys.js
 *
 * 2. Add engine/supabase-keys.js to .gitignore (never commit the real key)
 *
 * 3. Replace the placeholder with your actual anon key:
 *      Supabase Dashboard → Settings → API → Project API Keys → anon / public
 *      URL: https://supabase.com/dashboard/project/ptuuuishzwwgmaexneul/settings/api
 *
 * 4. Add the script tag to all pages BEFORE email-capture.js loads:
 *      <script src="/engine/supabase-keys.js"></script>
 *
 * WHY THE ANON KEY IS SAFE IN CLIENT-SIDE JS:
 *   The anon key only allows what Row Level Security (RLS) permits.
 *   For email_subscribers, the anon role can INSERT only.
 *   No SELECT, UPDATE, or DELETE. The service role key is never exposed.
 *
 * ALTERNATIVE: Set the key via Cloudflare Pages build environment instead.
 *   See /platform/SUPABASE_DOCS.md for Cloudflare Pages injection instructions.
 */

window.FRFAM_SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY_HERE';
