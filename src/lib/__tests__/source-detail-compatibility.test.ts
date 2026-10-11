import { getDetailFromApi } from '../downstream';

jest.mock('@/lib/config', () => ({
  API_CONFIG: { detail: { path: '?ac=videolist&ids=', headers: {} } },
}));
jest.mock('@/lib/utils', () => ({
  cleanHtmlTags: (text: string) => text || '',
}));

const site = {
  key: 'test',
  name: 'Test source',
  api: 'https://api.example/vod',
  detail: 'https://page.example',
};
const originalFetch = global.fetch;
const fetchMock = jest.fn();
beforeEach(() => {
  fetchMock.mockReset();
  global.fetch = fetchMock;
});
afterAll(() => {
  global.fetch = originalFetch;
});

describe('existing source detail URLs', () => {
  it('uses playable JSON first even when a detail page is configured', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        list: [
          {
            vod_name: 'Test film',
            vod_play_url: 'HD$https://media.example/index.m3u8',
          },
        ],
      }),
    });
    expect((await getDetailFromApi(site, '1')).episodes).toEqual([
      'https://media.example/index.m3u8',
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://api.example/vod?ac=videolist&ids=1'
    );
  });
  it('falls back to the old HTML detail page when JSON fails', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 500 });
    fetchMock.mockResolvedValueOnce({
      ok: true,
      text: async () => '<h1>Test film</h1>$https://media.example/index.m3u8',
    });
    expect((await getDetailFromApi(site, '1')).episodes).toEqual([
      'https://media.example/index.m3u8',
    ]);
    expect(fetchMock.mock.calls[1][0]).toBe(
      'https://page.example/index.php/vod/detail/id/1.html'
    );
  });
  it('does not hide an API error when no HTML fallback exists', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 403 });
    await expect(
      getDetailFromApi({ ...site, detail: undefined }, '1')
    ).rejects.toThrow('403');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
