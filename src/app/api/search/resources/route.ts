import { NextRequest, NextResponse } from 'next/server';

import { getAuthInfoFromCookie } from '@/lib/auth';
import { getAvailableApiSites } from '@/lib/config';

export const runtime = 'edge';

// OrionTV 兼容接口
export async function GET(request: NextRequest) {
  try {
    const auth = getAuthInfoFromCookie(request);
    if (process.env.PASSWORD && !auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const username = auth?.username;
    const apiSites = await getAvailableApiSites(username);

    return NextResponse.json(apiSites, {
      headers: {
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (error) {
    return NextResponse.json({ error: '获取资源失败' }, { status: 500 });
  }
}
