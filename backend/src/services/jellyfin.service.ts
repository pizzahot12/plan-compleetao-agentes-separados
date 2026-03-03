import type {
  JellyfinItem,
  JellyfinMediaStream,
  MediaItem,
  MediaDetails,
} from '../types/index.js'
import logger from '../utils/logger.js'

const JELLYFIN_URL = process.env.JELLYFIN_URL || ''
const JELLYFIN_API_KEY = process.env.JELLYFIN_API_KEY || ''

let jellyfinUserId = ''

if (!JELLYFIN_URL || !JELLYFIN_API_KEY) {
  logger.warn('JELLYFIN_URL or JELLYFIN_API_KEY not configured')
}

async function getJellyfinUserId(): Promise<string> {
  if (jellyfinUserId) return jellyfinUserId

  const response = await fetch(
    `${JELLYFIN_URL}/Users?api_key=${JELLYFIN_API_KEY}`
  )
  if (!response.ok) throw new Error('Failed to get Jellyfin users')

  const users = await response.json() as Array<{ Id: string; Policy: { IsAdministrator: boolean } }>
  const admin = users.find((u) => u.Policy.IsAdministrator)
  jellyfinUserId = admin ? admin.Id : users[0].Id
  logger.info(`Jellyfin userId resolved: ${jellyfinUserId}`)
  return jellyfinUserId
}

async function jellyfinFetch<T>(path: string): Promise<T> {
  if (!JELLYFIN_URL || !JELLYFIN_API_KEY) {
    throw new Error('Jellyfin not configured')
  }

  const url = `${JELLYFIN_URL}${path}`
  const separator = path.includes('?') ? '&' : '?'

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 25000)

  try {
    logger.debug(`Jellyfin fetch: ${path}`)
    const response = await fetch(`${url}${separator}api_key=${JELLYFIN_API_KEY}`, {
      signal: controller.signal,
    })

    if (!response.ok) {
      const errorText = await response.text()
      logger.error(`Jellyfin API error: ${response.status} ${response.statusText} for ${path} - ${errorText}`)
      throw new Error(`Jellyfin API error: ${response.status}`)
    }

    return response.json() as Promise<T>
  } catch (err) {
    const error = err as Error
    logger.error(`Jellyfin fetch failed for ${path}: ${error.message}`)
    throw err
  } finally {
    clearTimeout(timeout)
  }
}

function ticksToSeconds(ticks: number): number {
  return Math.floor(ticks / 10_000_000)
}

function mapJellyfinToMedia(item: JellyfinItem): MediaItem {
  const posterTag = item.ImageTags?.['Primary']
  const backdropTag = item.BackdropImageTags?.[0]

  return {
    id: item.Id,
    title: item.Name,
    poster: posterTag
      ? `${JELLYFIN_URL}/Items/${item.Id}/Images/Primary?tag=${posterTag}&api_key=${JELLYFIN_API_KEY}`
      : '',
    backdrop: backdropTag
      ? `${JELLYFIN_URL}/Items/${item.Id}/Images/Backdrop?tag=${backdropTag}&api_key=${JELLYFIN_API_KEY}`
      : '',
    rating: item.CommunityRating || 0,
    year: item.ProductionYear || 0,
    duration: item.RunTimeTicks ? ticksToSeconds(item.RunTimeTicks) : 0,
    synopsis: item.Overview || '',
    genres: item.Genres || [],
    type: item.Type === 'Series' ? 'series' : 'movie',
  }
}

export async function getMediaList(
  type: string = 'movies',
  skip: number = 0,
  limit: number = 20
): Promise<MediaItem[]> {
  const userId = await getJellyfinUserId()

  // Cap per-request limit to avoid Jellyfin timeouts
  const jellyfinLimit = Math.min(limit, 100)

  // type=all: fetch movies + series in parallel with a small limit
  if (type === 'all') {
    const halfLimit = Math.min(Math.ceil(jellyfinLimit / 2), 5)
    const [moviesData, seriesData] = await Promise.all([
      jellyfinFetch<{ Items: JellyfinItem[] }>(
        `/Users/${userId}/Items?ParentId=ed2a25286c558a96e1424971742ca250&IncludeItemTypes=Movie&StartIndex=${skip}&Limit=${halfLimit}&SortBy=CommunityRating&SortOrder=Descending`
      ).catch(() => ({ Items: [] as JellyfinItem[] })),
      jellyfinFetch<{ Items: JellyfinItem[] }>(
        `/Users/${userId}/Items?ParentId=5ddaa59a73205234890fdcfc683e14ed&IncludeItemTypes=Series&StartIndex=${skip}&Limit=${halfLimit}&SortBy=CommunityRating&SortOrder=Descending`
      ).catch(() => ({ Items: [] as JellyfinItem[] })),
    ])
    return [...moviesData.Items.map(mapJellyfinToMedia), ...seriesData.Items.map(mapJellyfinToMedia)]
  }

  if (type === 'series') {
    const data = await jellyfinFetch<{ Items: JellyfinItem[] }>(
      `/Users/${userId}/Items?ParentId=5ddaa59a73205234890fdcfc683e14ed&IncludeItemTypes=Series&StartIndex=${skip}&Limit=${jellyfinLimit}`
    )
    return data.Items.map(mapJellyfinToMedia)
  }

  // For movies, use the Movies folder
  const data = await jellyfinFetch<{ Items: JellyfinItem[] }>(
    `/Users/${userId}/Items?ParentId=ed2a25286c558a96e1424971742ca250&IncludeItemTypes=Movie&StartIndex=${skip}&Limit=${jellyfinLimit}`
  )

  return data.Items.map(mapJellyfinToMedia)
}

export async function getMediaDetails(mediaId: string): Promise<MediaDetails> {
  const userId = await getJellyfinUserId()
  const item = await jellyfinFetch<JellyfinItem>(
    `/Users/${userId}/Items/${mediaId}?Fields=Overview,Genres,People,MediaStreams`
  )

  const base = mapJellyfinToMedia(item)

  const cast = (item.People || [])
    .filter((p) => p.Type === 'Actor')
    .slice(0, 20)
    .map((p) => ({
      name: p.Name,
      role: p.Role || '',
    }))

  const streams = item.MediaStreams || []
  const subtitles = streams
    .filter((s) => s.Type === 'Subtitle' && s.Language)
    .map((s) => s.Language!)
  const audio = streams
    .filter((s) => s.Type === 'Audio' && s.Language)
    .map((s) => s.Language!)

  return {
    ...base,
    cast,
    subtitles: [...new Set(subtitles)],
    audio: [...new Set(audio)],
  }
}

export interface SubtitleInfo {
  index: number
  language: string
  displayTitle: string
  codec: string
  isExternal: boolean
}

export interface AudioInfo {
  index: number
  language: string
  displayTitle: string
  codec: string
  isDefault: boolean
}

export interface MediaStreamInfo {
  subtitles: SubtitleInfo[]
  audio: AudioInfo[]
}

export async function getMediaStreams(mediaId: string): Promise<MediaStreamInfo> {
  const data = await jellyfinFetch<{
    MediaSources: Array<{ MediaStreams: JellyfinMediaStream[] }>
  }>(`/Items/${mediaId}/PlaybackInfo`)

  const streams = data.MediaSources?.[0]?.MediaStreams || []

  const subtitles: SubtitleInfo[] = streams
    .filter((s) => s.Type === 'Subtitle')
    .map((s) => ({
      index: s.Index,
      language: s.Language || 'und',
      displayTitle: s.DisplayTitle || s.Language || 'Unknown',
      codec: s.Codec || 'unknown',
      isExternal: s.IsExternal || false,
    }))

  const audio: AudioInfo[] = streams
    .filter((s) => s.Type === 'Audio')
    .map((s) => ({
      index: s.Index,
      language: s.Language || 'und',
      displayTitle: s.DisplayTitle || s.Language || 'Unknown',
      codec: s.Codec || 'unknown',
      isDefault: s.IsDefault || false,
    }))

  return { subtitles, audio }
}

export interface EpisodeInfo {
  id: string
  title: string
  season: number
  episode: number
  synopsis: string
  duration: number
  poster: string
}

export async function getSeasons(seriesId: string): Promise<Array<{ id: string; name: string; number: number }>> {
  const data = await jellyfinFetch<{ Items: JellyfinItem[] }>(
    `/Shows/${seriesId}/Seasons`
  )

  return data.Items.map((item) => ({
    id: item.Id,
    name: item.Name,
    number: item.IndexNumber || 0,
  }))
}

export async function getEpisodes(
  seriesId: string,
  seasonId?: string
): Promise<EpisodeInfo[]> {
  const params = seasonId ? `&SeasonId=${seasonId}` : ''
  const data = await jellyfinFetch<{ Items: JellyfinItem[] }>(
    `/Shows/${seriesId}/Episodes?Fields=Overview${params}`
  )

  return data.Items.map((item) => ({
    id: item.Id,
    title: item.Name,
    season: item.ParentIndexNumber || 1,
    episode: item.IndexNumber || 0,
    synopsis: item.Overview || '',
    duration: item.RunTimeTicks ? ticksToSeconds(item.RunTimeTicks) : 0,
    poster: item.ImageTags?.['Primary']
      ? `${JELLYFIN_URL}/Items/${item.Id}/Images/Primary?api_key=${JELLYFIN_API_KEY}`
      : '',
  }))
}

export function getStreamUrl(
  mediaId: string,
  options: {
    audioStreamIndex?: number
    subtitleStreamIndex?: number
  } = {}
): string {
  const params = new URLSearchParams({
    Static: 'true',
    api_key: JELLYFIN_API_KEY,
  })

  if (options.audioStreamIndex !== undefined) {
    params.set('AudioStreamIndex', String(options.audioStreamIndex))
  }
  if (options.subtitleStreamIndex !== undefined) {
    params.set('SubtitleStreamIndex', String(options.subtitleStreamIndex))
  }

  return `${JELLYFIN_URL}/Videos/${mediaId}/stream?${params}`
}

export function getImageUrl(
  itemId: string,
  imageType: 'Primary' | 'Backdrop' | 'Logo' | 'Thumb' = 'Primary',
  maxWidth?: number
): string {
  if (!JELLYFIN_URL) {
    return ''
  }

  const params = new URLSearchParams({
    api_key: JELLYFIN_API_KEY,
  })

  if (maxWidth) {
    params.set('maxWidth', String(maxWidth))
  }

  return `${JELLYFIN_URL}/Items/${itemId}/Images/${imageType}?${params}`
}

export interface JellyfinStatus {
  connected: boolean
  serverName?: string
  version?: string
  error?: string
}

export async function checkConnection(): Promise<JellyfinStatus> {
  if (!JELLYFIN_URL || !JELLYFIN_API_KEY) {
    return {
      connected: false,
      error: 'Jellyfin not configured',
    }
  }

  try {
    const data = await jellyfinFetch<{
      ServerName: string
      Version: string
    }>('/System/Info/Public')

    return {
      connected: true,
      serverName: data.ServerName,
      version: data.Version,
    }
  } catch (error) {
    return {
      connected: false,
      error: (error as Error).message,
    }
  }
}

export function isConfigured(): boolean {
  return !!JELLYFIN_URL && !!JELLYFIN_API_KEY
}

const BITRATE_MAP = [
  { kbps: 20000, label: '1080p (20 Mbps)', maxW: 1920, maxH: 1080, id: 108020 },
  { kbps: 12000, label: '1080p (12 Mbps)', maxW: 1920, maxH: 1080, id: 108012 },
  { kbps: 8000, label: '720p  (8 Mbps)', maxW: 1280, maxH: 720, id: 72008 },
  { kbps: 4000, label: '720p  (4 Mbps)', maxW: 1280, maxH: 720, id: 72004 },
  { kbps: 2000, label: '480p  (2 Mbps)', maxW: 720, maxH: 480, id: 48002 },
  { kbps: 720, label: '360p  (720 kbps)', maxW: 480, maxH: 320, id: 36000 },
  { kbps: 320, label: '240p  (320 kbps)', maxW: 480, maxH: 240, id: 24000 },
]

export interface PlaybackInfoResult {
  playSessionId: string
  originalHeight: number
  audioStreams: Array<{ Index: number; Language: string; Codec: string; DisplayTitle: string; IsDefault: boolean }>
  subtitleStreams: Array<{ Index: number; Language: string; Codec: string; DisplayTitle: string; IsDefault: boolean }>
  qualities: Array<{ src: string; type: string; size: number }>
  qualityLabels: Record<number, string>
}

/**
 * Fetches Jellyfin MediaSources for a given item and builds HLS
 * transcoding URLs server-side so the api_key never reaches the browser.
 */
export async function getPlaybackInfo(
  mediaId: string,
  audioIndex?: number,
  subtitleIndex?: number,
): Promise<PlaybackInfoResult> {
  const userId = await getJellyfinUserId()

  // Stable session ID per invocation — prevents Jellyfin from killing the transcode on setting changes
  const playSessionId = `pp_${mediaId.substring(0, 8)}_${Date.now()}`

  // Get item metadata with MediaSources
  const data = await jellyfinFetch<{ Items: Array<{ Id: string; MediaSources: Array<{ Id: string; MediaStreams: Array<{ Type: string; Index: number; Language?: string; Codec?: string; DisplayTitle?: string; IsDefault?: boolean; Height?: number }> }> }> }>(
    `/Users/${userId}/Items/${mediaId}?Fields=MediaSources,MediaStreams`
  )

  const item = data.Items?.[0] ?? { Id: mediaId, MediaSources: [] }
  const source = (item.MediaSources ?? [])[0] ?? { Id: mediaId, MediaStreams: [] }
  const streams = source.MediaStreams ?? []

  const audioStreams = streams
    .filter(s => s.Type === 'Audio')
    .map(s => ({
      Index: s.Index,
      Language: s.Language ?? '',
      Codec: s.Codec ?? '',
      DisplayTitle: s.DisplayTitle ?? '',
      IsDefault: s.IsDefault ?? false,
    }))

  const subtitleStreams = streams
    .filter(s => s.Type === 'Subtitle')
    .map(s => ({
      Index: s.Index,
      Language: s.Language ?? '',
      Codec: s.Codec ?? '',
      DisplayTitle: s.DisplayTitle ?? '',
      IsDefault: s.IsDefault ?? false,
    }))

  const videoStream = streams.find(s => s.Type === 'Video')
  const originalHeight = videoStream?.Height ?? 1080

  // Resolve audio/subtitle indices
  const targetAudio = audioIndex ?? audioStreams.find(a => a.IsDefault)?.Index ?? audioStreams[0]?.Index
  const targetSub = subtitleIndex ?? -1

  const activeSub = targetSub > -1 ? targetSub : -1;
  const subParam = activeSub > -1
    ? `&SubtitleStreamIndex=${activeSub}&SubtitleMethod=Encode`
    : '';

  const audioParam = targetAudio !== undefined
    ? `&AudioStreamIndex=${targetAudio}&AudioCodec=aac&TranscodingMaxAudioChannels=2`
    : '';

  const hlsBase = (
    `${JELLYFIN_URL}/Videos/${item.Id}/master.m3u8` +
    `?api_key=${JELLYFIN_API_KEY}` +
    `&MediaSourceId=${source.Id}` +
    `&DeviceId=watchparty` +
    `&PlaySessionId=${playSessionId}` +
    `&VideoCodec=h264` +
    `&TranscodingMaxAudioChannels=2` +
    `&SegmentContainer=fmp4` +
    `&MinSegments=2` +
    `&BreakOnNonKeyFrames=true` +
    `&ManifestTranscriptionEnabled=true` +
    `&TranscodeReasons=ContainerNotSupported,VideoCodecNotSupported` +
    audioParam +
    subParam
  )

  const qualityLabels: Record<number, string> = {
    [originalHeight]: `Original (${originalHeight}p)`,
  }

  const qualities: Array<{ src: string; type: string; size: number }> = [
    { src: hlsBase, type: 'application/x-mpegURL', size: originalHeight },
  ]

  BITRATE_MAP
    .filter(opt => opt.maxH <= originalHeight)
    .forEach(opt => {
      qualityLabels[opt.id] = opt.label
      qualities.push({
        src: `${hlsBase}&VideoBitrate=${opt.kbps * 1000}&MaxWidth=${opt.maxW}&MaxHeight=${opt.maxH}`,
        type: 'application/x-mpegURL',
        size: opt.id,
      })
    })

  return {
    playSessionId,
    originalHeight,
    audioStreams,
    subtitleStreams,
    qualities,
    qualityLabels,
  }
}

