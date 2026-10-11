import type { NextRequest } from 'next/server';

import { getAuthInfoFromCookie, parseAuthCookie } from '../auth';

const originalEnv = { ...process.env };
afterEach(() => {
  process.env = { ...originalEnv };
});

describe('existing authentication cookies', () => {
  const data = { password: 'test-only-100%value', role: 'user' };
  const json = JSON.stringify(data);
  it.each([
    json,
    encodeURIComponent(json),
    encodeURIComponent(encodeURIComponent(json)),
  ])(
    'reads raw, encoded and double-encoded cookies without changing passwords',
    (value) => {
      expect(parseAuthCookie(value)).toEqual(data);
    }
  );
  it.each(['%broken', 'null', '[]', '"text"', 'not-json'])(
    'rejects invalid cookie %s',
    (value) => {
      expect(parseAuthCookie(value)).toBeNull();
    }
  );
  it('keeps localstorage logins compatible with source routes', () => {
    process.env.NEXT_PUBLIC_STORAGE_TYPE = 'localstorage';
    process.env.USERNAME = 'existing-owner';
    const request = {
      cookies: { get: () => ({ value: encodeURIComponent(json) }) },
    } as unknown as NextRequest;
    expect(getAuthInfoFromCookie(request)).toEqual({
      ...data,
      username: 'existing-owner',
    });
  });
  it('does not invent a username in database mode', () => {
    process.env.NEXT_PUBLIC_STORAGE_TYPE = 'upstash';
    process.env.USERNAME = 'existing-owner';
    const request = {
      cookies: { get: () => ({ value: json }) },
    } as unknown as NextRequest;
    expect(getAuthInfoFromCookie(request)?.username).toBeUndefined();
  });
  it('preserves signed database identities', () => {
    expect(
      parseAuthCookie(
        encodeURIComponent(
          JSON.stringify({ username: 'user', signature: 'abc' })
        )
      )
    ).toEqual({ username: 'user', signature: 'abc' });
  });
});
