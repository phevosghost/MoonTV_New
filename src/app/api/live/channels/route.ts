import { NextResponse } from 'next/server';

import { liveChannels } from '@/lib/live';

export const runtime = 'edge';

export async function GET() {
  return NextResponse.json(
    {
      channels: liveChannels,
      updatedAt: new Date().toISOString(),
    },
    {
      headers: {
        'Cache-Control': 'public, max-age=300, s-maxage=300',
      },
    }
  );
}
