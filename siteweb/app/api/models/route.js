import { PROVIDERS } from '@/lib/providers';

export const runtime = 'nodejs';

export async function GET() {
  return new Response(JSON.stringify({ providers: PROVIDERS }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
