export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      fitness_snapshots: {
        Row: {
          revision: number
          schema_version: number
          state: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          revision?: number
          schema_version: number
          state: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          revision?: number
          schema_version?: number
          state?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      save_fitness_snapshot: {
        Args: {
          p_expected_revision: number
          p_schema_version: number
          p_state: Json
        }
        Returns: {
          revision: number
          updated_at: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
