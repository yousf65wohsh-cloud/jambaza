export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type TrackSource = "upload" | "youtube";
export type FriendshipStatus = "pending" | "accepted";
export type FriendshipDirection = "incoming" | "outgoing" | "accepted";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string;
          display_name: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username: string;
          display_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          username?: string;
          display_name?: string | null;
          avatar_url?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      tracks: {
        Row: {
          id: string;
          owner_id: string;
          title: string;
          artist: string | null;
          cover_url: string | null;
          audio_path: string | null;
          duration_seconds: number | null;
          source_type: TrackSource;
          youtube_video_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          title: string;
          artist?: string | null;
          cover_url?: string | null;
          audio_path?: string | null;
          duration_seconds?: number | null;
          source_type: TrackSource;
          youtube_video_id?: string | null;
        };
        Update: {
          title?: string;
          artist?: string | null;
          cover_url?: string | null;
          audio_path?: string | null;
          duration_seconds?: number | null;
          source_type?: TrackSource;
          youtube_video_id?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      playlists: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          is_public: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          name: string;
          is_public?: boolean;
        };
        Update: {
          name?: string;
          is_public?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      playlist_tracks: {
        Row: {
          playlist_id: string;
          track_id: string;
          position: number;
        };
        Insert: {
          playlist_id: string;
          track_id: string;
          position?: number;
        };
        Update: {
          position?: number;
        };
        Relationships: [];
      };
      friendships: {
        Row: {
          id: string;
          requester_id: string;
          addressee_id: string;
          status: FriendshipStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          requester_id: string;
          addressee_id: string;
          status?: FriendshipStatus;
        };
        Update: {
          status?: FriendshipStatus;
          updated_at?: string;
        };
        Relationships: [];
      };
      listening_rooms: {
        Row: {
          id: string;
          host_id: string;
          video_id: string;
          is_playing: boolean;
          position_seconds: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          host_id: string;
          video_id: string;
          is_playing?: boolean;
          position_seconds?: number;
        };
        Update: {
          video_id?: string;
          is_playing?: boolean;
          position_seconds?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      room_members: {
        Row: {
          room_id: string;
          user_id: string;
          joined_at: string;
        };
        Insert: {
          room_id: string;
          user_id: string;
          joined_at?: string;
        };
        Update: {
          joined_at?: string;
        };
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      list_my_friendships: {
        Args: Record<PropertyKey, never>;
        Returns: {
          friendship_id: string;
          status: FriendshipStatus;
          direction: FriendshipDirection;
          friend_id: string;
          friend_username: string;
          friend_display_name: string | null;
          friend_avatar_url: string | null;
          created_at: string;
        }[];
      };
      search_profiles: {
        Args: {
          p_query: string;
        };
        Returns: {
          id: string;
          username: string;
          display_name: string | null;
          avatar_url: string | null;
        }[];
      };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
}

export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
export type TrackRow = Database["public"]["Tables"]["tracks"]["Row"];
export type PlaylistRow = Database["public"]["Tables"]["playlists"]["Row"];
export type PlaylistTrackRow = Database["public"]["Tables"]["playlist_tracks"]["Row"];
export type FriendshipRow = Database["public"]["Tables"]["friendships"]["Row"];
export type ListeningRoomRow = Database["public"]["Tables"]["listening_rooms"]["Row"];
export type RoomMemberRow = Database["public"]["Tables"]["room_members"]["Row"];
