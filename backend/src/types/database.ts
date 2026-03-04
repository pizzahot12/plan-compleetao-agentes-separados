// ============================================
// Supabase Database Type Definitions
// Generated from PlexParty schema
// ============================================

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          name: string
          avatar: string | null
          is_approved: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          name: string
          avatar?: string | null
          is_approved?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string
          avatar?: string | null
          is_approved?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      media: {
        Row: {
          id: string
          jellyfin_id: string | null
          title: string
          type: string
          poster_url: string | null
          backdrop_url: string | null
          synopsis: string | null
          rating: number
          year: number | null
          duration: number | null
          genres: string[] | null
          cast: string[] | null
          subtitles: string[] | null
          audio: string[] | null
          cached_at: string
        }
        Insert: {
          id: string
          jellyfin_id?: string | null
          title: string
          type: string
          poster_url?: string | null
          backdrop_url?: string | null
          synopsis?: string | null
          rating?: number
          year?: number | null
          duration?: number | null
          genres?: string[] | null
          cast?: string[] | null
          subtitles?: string[] | null
          audio?: string[] | null
          cached_at?: string
        }
        Update: {
          id?: string
          jellyfin_id?: string | null
          title?: string
          type?: string
          poster_url?: string | null
          backdrop_url?: string | null
          synopsis?: string | null
          rating?: number
          year?: number | null
          duration?: number | null
          genres?: string[] | null
          cast?: string[] | null
          subtitles?: string[] | null
          audio?: string[] | null
          cached_at?: string
        }
        Relationships: []
      }
      rooms: {
        Row: {
          id: string
          code: string
          media_id: string
          host_id: string
          name: string
          is_private: boolean
          created_at: string
          expires_at: string | null
        }
        Insert: {
          id?: string
          code?: string
          media_id: string
          host_id: string
          name?: string
          is_private?: boolean
          created_at?: string
          expires_at?: string | null
        }
        Update: {
          id?: string
          code?: string
          media_id?: string
          host_id?: string
          name?: string
          is_private?: boolean
          expires_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'rooms_host_id_fkey'
            columns: ['host_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      room_participants: {
        Row: {
          id: string
          room_id: string
          user_id: string
          joined_at: string
        }
        Insert: {
          id?: string
          room_id: string
          user_id: string
          joined_at?: string
        }
        Update: {
          id?: string
          room_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'room_participants_room_id_fkey'
            columns: ['room_id']
            isOneToOne: false
            referencedRelation: 'rooms'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'room_participants_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      room_messages: {
        Row: {
          id: string
          room_id: string
          user_id: string
          text: string
          created_at: string
        }
        Insert: {
          id?: string
          room_id: string
          user_id: string
          text: string
          created_at?: string
        }
        Update: {
          id?: string
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: 'room_messages_room_id_fkey'
            columns: ['room_id']
            isOneToOne: false
            referencedRelation: 'rooms'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'room_messages_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      watch_history: {
        Row: {
          id: string
          user_id: string
          media_id: string
          current_time: number
          duration: number
          completed: boolean
          last_watched_at: string
        }
        Insert: {
          id?: string
          user_id: string
          media_id: string
          current_time?: number
          duration: number
          completed?: boolean
          last_watched_at?: string
        }
        Update: {
          id?: string
          current_time?: number
          duration?: number
          completed?: boolean
          last_watched_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'watch_history_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      friends: {
        Row: {
          id: string
          user_id: string
          friend_id: string
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          friend_id: string
          status?: string
          created_at?: string
        }
        Update: {
          id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: 'friends_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'friends_friend_id_fkey'
            columns: ['friend_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: string
          data: Record<string, unknown> | null
          read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: string
          data?: Record<string, unknown> | null
          read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          read?: boolean
        }
        Relationships: [
          {
            foreignKeyName: 'notifications_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: Record<string, never>
    Functions: {
      generate_room_code: {
        Args: Record<string, never>
        Returns: string
      }
      delete_empty_rooms: {
        Args: Record<string, never>
        Returns: undefined
      }
    }
  }
}

// Convenience type aliases
export type Profile = Database['public']['Tables']['profiles']['Row']
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert']
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update']

export type MediaRow = Database['public']['Tables']['media']['Row']
export type MediaInsert = Database['public']['Tables']['media']['Insert']
export type MediaUpdate = Database['public']['Tables']['media']['Update']

export type RoomRow = Database['public']['Tables']['rooms']['Row']
export type RoomInsert = Database['public']['Tables']['rooms']['Insert']

export type RoomParticipantRow = Database['public']['Tables']['room_participants']['Row']

export type RoomMessageRow = Database['public']['Tables']['room_messages']['Row']

export type WatchHistoryRow = Database['public']['Tables']['watch_history']['Row']
export type WatchHistoryInsert = Database['public']['Tables']['watch_history']['Insert']
export type WatchHistoryUpdate = Database['public']['Tables']['watch_history']['Update']

export type FriendRow = Database['public']['Tables']['friends']['Row']

export type NotificationRow = Database['public']['Tables']['notifications']['Row']
export type NotificationInsert = Database['public']['Tables']['notifications']['Insert']
