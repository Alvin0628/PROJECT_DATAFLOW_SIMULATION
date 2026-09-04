import 'server-only';

/**
 * Server Components need an absolute URL to fetch their own API routes.
 * VERCEL_URL is provided automatically in production; localhost is used locally.
 */
export function getBaseUrl(): string {
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return `http://localhost:${process.env.PORT ?? 3000}`;
}