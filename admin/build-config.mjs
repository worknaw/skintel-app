import { writeFile } from 'node:fs/promises';

let publicFallback = {};
try {
  const module = await import('./config.public.mjs');
  publicFallback = module.default || {};
} catch {
  // The fallback file is optional for local builds.
}

const url = process.env.SKINCYCLE_SUPABASE_URL
  || process.env.EXPO_PUBLIC_SUPABASE_URL
  || process.env.SUPABASE_URL
  || publicFallback.url;
const publishableKey = process.env.SKINCYCLE_SUPABASE_PUBLISHABLE_KEY
  || process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  || process.env.SUPABASE_PUBLISHABLE_KEY
  || publicFallback.publishableKey;

const value = `window.SUPABASE_CONFIG = ${JSON.stringify({ url: url || '', publishableKey: publishableKey || '' })};\n`;
await writeFile(new URL('./config.js', import.meta.url), value, 'utf8');
console.log(url && publishableKey ? 'Generated admin/config.js with Supabase configuration' : 'Generated empty admin/config.js; admin will show a configuration error and will not load mock data');
