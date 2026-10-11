jest.mock('@/lib/db', () => ({ getStorage: jest.fn() }));

import runtimeConfig from '../runtime';

const originalEnv = { ...process.env };
beforeEach(() => {
  jest.resetModules();
});
afterEach(() => {
  process.env = { ...originalEnv };
});

async function loadConfig() {
  const { getConfig } = await import('../config');
  return getConfig();
}

describe('site configuration migration', () => {
  it('keeps the existing public site-name variable and generated source list', async () => {
    process.env.NEXT_PUBLIC_STORAGE_TYPE = 'localstorage';
    process.env.NEXT_PUBLIC_SITE_NAME = 'Existing cinema';
    process.env.SITE_NAME = 'Lower priority name';
    const config = await loadConfig();
    expect(config.SiteConfig.SiteName).toBe('Existing cinema');
    expect(
      config.SourceConfig.map(({ key, api, name }) => ({ key, api, name }))
    ).toEqual(
      Object.entries(runtimeConfig.api_site).map(([key, site]) => ({
        key,
        api: site.api,
        name: site.name,
      }))
    );
    expect(config.SourceConfig).toHaveLength(24);
  });
  it('supports SITE_NAME without changing Vercel variables', async () => {
    delete process.env.NEXT_PUBLIC_SITE_NAME;
    process.env.SITE_NAME = 'Existing private name';
    process.env.NEXT_PUBLIC_STORAGE_TYPE = 'localstorage';
    expect((await loadConfig()).SiteConfig.SiteName).toBe(
      'Existing private name'
    );
  });
  it('keeps content filtering disabled by default', async () => {
    delete process.env.NEXT_PUBLIC_DISABLE_YELLOW_FILTER;
    process.env.NEXT_PUBLIC_STORAGE_TYPE = 'localstorage';
    expect((await loadConfig()).SiteConfig.DisableYellowFilter).toBe(true);
  });
});
