import 'server-only';

/**
 * Server Component butuh URL ABSOLUT untuk fetch API route miliknya sendiri
 * VERCEL_URL di-inject OTOMATIS oleh Vercel saat production.
 * Untuk local dev, fallback ke localhost.
 */
export function getBaseUrl(): string {
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return `http://localhost:${process.env.PORT ?? 3000}`;
}