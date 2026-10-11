import { NextRequest } from 'next/server';

type AuthInfo = {
  password?: string;
  username?: string;
  signature?: string;
  timestamp?: number;
  role?: 'owner' | 'admin' | 'user';
};

export function parseAuthCookie(value: string): AuthInfo | null {
  let decoded = value;
  // NextResponse can encode an already encoded cookie a second time.
  for (let attempt = 0; attempt <= 2; attempt += 1) {
    try {
      const data = JSON.parse(decoded);
      return data && typeof data === 'object' && !Array.isArray(data)
        ? data
        : null;
    } catch {
      if (attempt === 2) return null;
      try {
        decoded = decodeURIComponent(decoded);
      } catch {
        return null;
      }
    }
  }
  return null;
}

// 从cookie获取认证信息 (服务端使用)
export function getAuthInfoFromCookie(request: NextRequest): {
  password?: string;
  username?: string;
  signature?: string;
  timestamp?: number;
} | null {
  const authCookie = request.cookies.get('auth');

  if (!authCookie) {
    return null;
  }

  const authData = parseAuthCookie(authCookie.value);
  if (
    authData &&
    !authData.username &&
    (process.env.NEXT_PUBLIC_STORAGE_TYPE || 'localstorage') === 'localstorage'
  ) {
    authData.username = process.env.USERNAME || 'localstorage';
  }
  return authData;
}

// 从cookie获取认证信息 (客户端使用)
export function getAuthInfoFromBrowserCookie(): {
  password?: string;
  username?: string;
  signature?: string;
  timestamp?: number;
  role?: 'owner' | 'admin' | 'user';
} | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    // 解析 document.cookie
    const cookies = document.cookie.split(';').reduce((acc, cookie) => {
      const trimmed = cookie.trim();
      const firstEqualIndex = trimmed.indexOf('=');

      if (firstEqualIndex > 0) {
        const key = trimmed.substring(0, firstEqualIndex);
        const value = trimmed.substring(firstEqualIndex + 1);
        if (key && value) {
          acc[key] = value;
        }
      }

      return acc;
    }, {} as Record<string, string>);

    const authCookie = cookies['auth'];
    if (!authCookie) {
      return null;
    }

    return parseAuthCookie(authCookie);
  } catch (error) {
    return null;
  }
}
