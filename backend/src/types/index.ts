// ============================================
// TIPOS PRINCIPALES - PlexParty Backend
// ============================================

// --- AUTH ---
export interface User {
  id: string
  email: string
  name: string
  avatar?: string
  created_at: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  email: string
  password: string
  name: string
}

export interface AuthResponse {
  token: string
  user: User
}

// --- MEDIA ---
export interface MediaItem {
  id: string
  title: string
  poster: string
  backdrop: string
  rating: number
  year: number
  duration: number
  synopsis: string
  genres: string[]
  type: string
}

export interface MediaDetails extends MediaItem {
  cast: CastMember[]
  subtitles: string[]
  audio: string[]
}

export interface CastMember {
  name: string
  role: string
}

// --- STREAM ---
export type Quality = '360p' | '480p' | '720p' | '1080p'

export interface StreamOptions {
  quality: Quality
  subtitle?: string
  audio?: string
}

export interface StreamResponse {
  url: string
  type: 'hls'
  quality: Quality
  subtitle: string
  audio: string
}

// --- ROOMS ---
export interface Room {
  id: string
  code: string
  media_id: string
  host_id: string
  name: string
  is_private: boolean
  created_at: string
}

export interface RoomDetails {
  roomId: string
  code: string
  mediaId: string
  host: RoomParticipant
  participants: RoomParticipant[]
  createdAt: string
}

export interface RoomParticipant {
  id: string
  name: string
  avatar?: string
  isWatching: boolean
  isOnline: boolean
}

export interface RoomMessage {
  messageId: string
  text: string
  userId: string
  userName: string
  timestamp: string
}

export interface RoomSync {
  status: 'play' | 'pause'
  currentTime: number
  playedBy?: string
}

// --- FRIENDS ---
export interface Friend {
  id: string
  name: string
  avatar?: string
  status: 'online' | 'offline'
  watching?: string
}

// --- NOTIFICATIONS ---
export interface Notification {
  id: string
  type: 'room_invite' | 'friend_request' | 'friend_joined' | 'user_joined'
  data: Record<string, unknown> | null
  read: boolean
  created_at: string
}

// --- WATCH HISTORY ---
export interface WatchHistoryEntry {
  mediaId: string
  currentTime: number
  duration: number
  completed: boolean
  lastWatchedAt: string
}

// --- WEBSOCKET ---
export type WSEventType =
  | 'user_joined'
  | 'user_left'
  | 'play'
  | 'pause'
  | 'seek'
  | 'message'
  | 'user_kicked'
  | 'room_closed'
  | 'chat_message'
  | 'quality_changed'
  | 'connection_established'

export interface WSEvent {
  type: WSEventType
  [key: string]: unknown
}

// --- JELLYFIN ---
export interface JellyfinItem {
  Id: string
  Name: string
  Overview?: string
  ImageTags?: Record<string, string>
  BackdropImageTags?: string[]
  CommunityRating?: number
  ProductionYear?: number
  RunTimeTicks?: number
  Genres?: string[]
  People?: JellyfinPerson[]
  MediaStreams?: JellyfinMediaStream[]
  IndexNumber?: number
  ParentIndexNumber?: number
  SeriesId?: string
  SeasonId?: string
  Type?: string
  RecursiveItemCount?: number
}

export interface JellyfinPerson {
  Name: string
  Role?: string
  Type: string
}

export interface JellyfinMediaStream {
  Type: 'Video' | 'Audio' | 'Subtitle'
  Language?: string
  DisplayTitle?: string
  Index: number
  Codec?: string
  IsExternal?: boolean
  IsDefault?: boolean
}

// --- HONO CONTEXT ---
export interface AppVariables {
  userId: string
  userEmail: string
}
