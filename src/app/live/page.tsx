/* eslint-disable @typescript-eslint/no-explicit-any */

'use client';

import Hls from 'hls.js';
import {
  ExternalLink,
  Loader2,
  Play,
  Radio,
  RefreshCw,
  Search,
  Signal,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { LiveChannel } from '@/lib/live';

import PageLayout from '@/components/PageLayout';

type LoadState = 'idle' | 'loading' | 'ready' | 'error';

const GROUPS = ['全部', '央视', 'CGTN', '卫视', '国际'] as const;

function LivePageClient() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [channels, setChannels] = useState<LiveChannel[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [query, setQuery] = useState('');
  const [activeGroup, setActiveGroup] = useState<(typeof GROUPS)[number]>('全部');
  const [pageLoading, setPageLoading] = useState(true);
  const [loadState, setLoadState] = useState<LoadState>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const selectedChannel = useMemo(
    () => channels.find((channel) => channel.id === selectedId) || channels[0],
    [channels, selectedId]
  );

  const filteredChannels = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return channels.filter((channel) => {
      const groupMatch = activeGroup === '全部' || channel.group === activeGroup;
      if (!groupMatch) return false;
      if (!keyword) return true;
      return `${channel.name} ${channel.category} ${channel.group}`
        .toLowerCase()
        .includes(keyword);
    });
  }, [channels, activeGroup, query]);

  useEffect(() => {
    let cancelled = false;
    async function loadChannels() {
      try {
        setPageLoading(true);
        const response = await fetch('/api/live/channels');
        const data = await response.json();
        if (cancelled) return;
        const nextChannels = Array.isArray(data.channels) ? data.channels : [];
        setChannels(nextChannels);
        setSelectedId(nextChannels[0]?.id || '');
      } catch (error) {
        if (!cancelled) {
          setErrorMessage('直播频道加载失败');
        }
      } finally {
        if (!cancelled) setPageLoading(false);
      }
    }
    loadChannels();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !selectedChannel?.url) return;

    setLoadState('loading');
    setErrorMessage('');

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const onCanPlay = () => {
      setLoadState('ready');
      video.play().catch(() => {
        // 浏览器可能会阻止自动播放，用户点击播放即可。
      });
    };
    const onVideoError = () => {
      setLoadState('error');
      setErrorMessage('当前频道暂时无法播放，可以切换其他频道重试');
    };

    video.addEventListener('canplay', onCanPlay);
    video.addEventListener('error', onVideoError);

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
      });
      hlsRef.current = hls;
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          setLoadState('error');
          setErrorMessage('直播流连接失败，可以切换频道或稍后重试');
          hls.destroy();
        }
      });
      hls.loadSource(selectedChannel.url);
      hls.attachMedia(video);
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = selectedChannel.url;
    } else {
      setLoadState('error');
      setErrorMessage('当前浏览器不支持 HLS 直播播放');
    }

    return () => {
      video.removeEventListener('canplay', onCanPlay);
      video.removeEventListener('error', onVideoError);
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      video.removeAttribute('src');
      video.load();
    };
  }, [selectedChannel]);

  const retryCurrentChannel = () => {
    if (!selectedChannel) return;
    setSelectedId('');
    window.requestAnimationFrame(() => setSelectedId(selectedChannel.id));
  };

  return (
    <PageLayout activePath='/live'>
      <div className='px-3 sm:px-8 py-4 sm:py-7'>
        <div className='max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_22rem] gap-4 lg:gap-6'>
          <section className='min-w-0'>
            <div className='relative bg-black overflow-hidden rounded-lg aspect-video shadow-xl'>
              <video
                ref={videoRef}
                controls
                playsInline
                className='absolute inset-0 h-full w-full bg-black'
              />

              {(loadState === 'loading' || pageLoading) && (
                <div className='absolute inset-0 flex items-center justify-center bg-black/60 text-white'>
                  <div className='flex items-center gap-3 text-sm'>
                    <Loader2 className='h-5 w-5 animate-spin' />
                    <span>正在连接直播信号</span>
                  </div>
                </div>
              )}

              {loadState === 'error' && (
                <div className='absolute inset-0 flex items-center justify-center bg-black/80 text-white'>
                  <div className='text-center px-6'>
                    <Signal className='h-9 w-9 mx-auto mb-3 text-red-300' />
                    <p className='text-base font-medium'>{errorMessage}</p>
                    <button
                      type='button'
                      onClick={retryCurrentChannel}
                      className='mt-4 inline-flex items-center gap-2 rounded-md bg-white/12 px-4 py-2 text-sm font-medium hover:bg-white/20'
                    >
                      <RefreshCw className='h-4 w-4' />
                      重试
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className='mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
              <div className='min-w-0'>
                <div className='flex items-center gap-2 text-green-600 dark:text-green-400'>
                  <Radio className='h-5 w-5' />
                  <h1 className='text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100'>
                    {selectedChannel?.name || '直播频道'}
                  </h1>
                </div>
                <p className='mt-1 text-sm text-gray-500 dark:text-gray-400'>
                  {selectedChannel
                    ? `${selectedChannel.group} / ${selectedChannel.category} / ${selectedChannel.source}`
                    : '请选择频道'}
                </p>
              </div>
              {selectedChannel?.website && (
                <a
                  href={selectedChannel.website}
                  target='_blank'
                  rel='noreferrer'
                  className='inline-flex items-center justify-center gap-2 rounded-md border border-gray-200 bg-white/70 px-3 py-2 text-sm text-gray-700 hover:text-green-600 dark:border-gray-700 dark:bg-gray-900/60 dark:text-gray-300 dark:hover:text-green-400'
                >
                  <ExternalLink className='h-4 w-4' />
                  官方页面
                </a>
              )}
            </div>
          </section>

          <aside className='min-h-0'>
            <div className='sticky top-20 rounded-lg border border-gray-200/70 bg-white/70 shadow-sm backdrop-blur dark:border-gray-800 dark:bg-gray-900/70'>
              <div className='p-3 border-b border-gray-200/70 dark:border-gray-800'>
                <div className='relative'>
                  <Search className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400' />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder='搜索直播频道'
                    className='h-10 w-full rounded-md border border-gray-200 bg-white pl-9 pr-3 text-sm text-gray-800 outline-none focus:border-green-400 focus:ring-2 focus:ring-green-400/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100'
                  />
                </div>

                <div className='mt-3 flex gap-2 overflow-x-auto scrollbar-hide'>
                  {GROUPS.map((group) => (
                    <button
                      key={group}
                      type='button'
                      onClick={() => setActiveGroup(group)}
                      className={`h-8 flex-shrink-0 rounded-md px-3 text-sm transition-colors ${
                        activeGroup === group
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                      }`}
                    >
                      {group}
                    </button>
                  ))}
                </div>
              </div>

              <div className='max-h-[52vh] overflow-y-auto p-2 lg:max-h-[calc(100vh-14rem)]'>
                {pageLoading ? (
                  <div className='flex h-28 items-center justify-center text-gray-500'>
                    <Loader2 className='h-5 w-5 animate-spin' />
                  </div>
                ) : filteredChannels.length === 0 ? (
                  <div className='px-3 py-10 text-center text-sm text-gray-500'>
                    没有匹配的频道
                  </div>
                ) : (
                  filteredChannels.map((channel) => {
                    const active = channel.id === selectedChannel?.id;
                    return (
                      <button
                        key={channel.id}
                        type='button'
                        onClick={() => setSelectedId(channel.id)}
                        className={`mb-2 flex w-full items-center gap-3 rounded-md px-3 py-3 text-left transition-colors ${
                          active
                            ? 'bg-green-500 text-white shadow-sm'
                            : 'bg-white/70 text-gray-800 hover:bg-green-50 hover:text-green-700 dark:bg-gray-800/60 dark:text-gray-200 dark:hover:bg-gray-700'
                        }`}
                      >
                        <span
                          className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md ${
                            active
                              ? 'bg-white/20'
                              : 'bg-gray-100 text-green-600 dark:bg-gray-900 dark:text-green-400'
                          }`}
                        >
                          <Play className='h-4 w-4' />
                        </span>
                        <span className='min-w-0 flex-1'>
                          <span className='block truncate text-sm font-medium'>
                            {channel.name}
                          </span>
                          <span
                            className={`mt-0.5 block truncate text-xs ${
                              active
                                ? 'text-white/80'
                                : 'text-gray-500 dark:text-gray-400'
                            }`}
                          >
                            {channel.group} / {channel.category}
                          </span>
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </PageLayout>
  );
}

export default function LivePage() {
  return <LivePageClient />;
}
