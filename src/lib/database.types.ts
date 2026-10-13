export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.17";
  };
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string;
          actor_id: string | null;
          created_at: string;
          entity_id: string | null;
          entity_type: string;
          id: string;
        };
        Insert: {
          action: string;
          actor_id?: string | null;
          created_at?: string;
          entity_id?: string | null;
          entity_type: string;
          id?: string;
        };
        Update: {
          action?: string;
          actor_id?: string | null;
          created_at?: string;
          entity_id?: string | null;
          entity_type?: string;
          id?: string;
        };
        Relationships: [];
      };
      authors: {
        Row: {
          bio: string | null;
          created_at: string;
          deleted_at: string | null;
          display_name: string;
          id: string;
          is_active: boolean;
          profile_id: string | null;
          slug: string;
          updated_at: string;
        };
        Insert: {
          bio?: string | null;
          created_at?: string;
          deleted_at?: string | null;
          display_name: string;
          id?: string;
          is_active?: boolean;
          profile_id?: string | null;
          slug: string;
          updated_at?: string;
        };
        Update: {
          bio?: string | null;
          created_at?: string;
          deleted_at?: string | null;
          display_name?: string;
          id?: string;
          is_active?: boolean;
          profile_id?: string | null;
          slug?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "authors_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      categories: {
        Row: {
          created_at: string;
          deleted_at: string | null;
          description: string | null;
          id: string;
          is_active: boolean;
          name: string;
          slug: string;
          sort_order: number;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          deleted_at?: string | null;
          description?: string | null;
          id?: string;
          is_active?: boolean;
          name: string;
          slug: string;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          deleted_at?: string | null;
          description?: string | null;
          id?: string;
          is_active?: boolean;
          name?: string;
          slug?: string;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      comments: {
        Row: {
          body: string;
          created_at: string;
          deleted_at: string | null;
          id: string;
          post_id: string;
          status: string;
          user_id: string | null;
        };
        Insert: {
          body: string;
          created_at?: string;
          deleted_at?: string | null;
          id?: string;
          post_id: string;
          status?: string;
          user_id?: string | null;
        };
        Update: {
          body?: string;
          created_at?: string;
          deleted_at?: string | null;
          id?: string;
          post_id?: string;
          status?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "comments_post_id_fkey";
            columns: ["post_id"];
            isOneToOne: false;
            referencedRelation: "posts";
            referencedColumns: ["id"];
          },
        ];
      };
      media_assets: {
        Row: {
          alt_text: string | null;
          created_at: string;
          deleted_at: string | null;
          id: string;
          mime_type: string;
          owner_id: string | null;
          path: string;
          size_bytes: number;
        };
        Insert: {
          alt_text?: string | null;
          created_at?: string;
          deleted_at?: string | null;
          id?: string;
          mime_type: string;
          owner_id?: string | null;
          path: string;
          size_bytes: number;
        };
        Update: {
          alt_text?: string | null;
          created_at?: string;
          deleted_at?: string | null;
          id?: string;
          mime_type?: string;
          owner_id?: string | null;
          path?: string;
          size_bytes?: number;
        };
        Relationships: [];
      };
      post_categories: {
        Row: {
          category_id: string;
          post_id: string;
        };
        Insert: {
          category_id: string;
          post_id: string;
        };
        Update: {
          category_id?: string;
          post_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "post_categories_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "post_categories_post_id_fkey";
            columns: ["post_id"];
            isOneToOne: false;
            referencedRelation: "posts";
            referencedColumns: ["id"];
          },
        ];
      };
      post_revisions: {
        Row: {
          created_at: string;
          editor_id: string | null;
          id: string;
          post_id: string;
          snapshot: Json;
        };
        Insert: {
          created_at?: string;
          editor_id?: string | null;
          id?: string;
          post_id: string;
          snapshot: Json;
        };
        Update: {
          created_at?: string;
          editor_id?: string | null;
          id?: string;
          post_id?: string;
          snapshot?: Json;
        };
        Relationships: [
          {
            foreignKeyName: "post_revisions_post_id_fkey";
            columns: ["post_id"];
            isOneToOne: false;
            referencedRelation: "posts";
            referencedColumns: ["id"];
          },
        ];
      };
      post_views: {
        Row: {
          created_at: string;
          id: string;
          post_id: string;
          viewed_on: string;
          visitor_hash: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          post_id: string;
          viewed_on?: string;
          visitor_hash: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          post_id?: string;
          viewed_on?: string;
          visitor_hash?: string;
        };
        Relationships: [
          {
            foreignKeyName: "post_views_post_id_fkey";
            columns: ["post_id"];
            isOneToOne: false;
            referencedRelation: "posts";
            referencedColumns: ["id"];
          },
        ];
      };
      posts: {
        Row: {
          author_id: string | null;
          content: string;
          cover_image: string | null;
          created_at: string;
          deleted_at: string | null;
          excerpt: string | null;
          featured: boolean;
          id: string;
          published_at: string | null;
          reading_minutes: number;
          scheduled_at: string | null;
          seo_description: string | null;
          seo_title: string | null;
          slug: string;
          status: string;
          title: string;
          updated_at: string;
          visibility: string;
        };
        Insert: {
          author_id?: string | null;
          content?: string;
          cover_image?: string | null;
          created_at?: string;
          deleted_at?: string | null;
          excerpt?: string | null;
          featured?: boolean;
          id?: string;
          published_at?: string | null;
          reading_minutes?: number;
          scheduled_at?: string | null;
          seo_description?: string | null;
          seo_title?: string | null;
          slug: string;
          status?: string;
          title: string;
          updated_at?: string;
          visibility?: string;
        };
        Update: {
          author_id?: string | null;
          content?: string;
          cover_image?: string | null;
          created_at?: string;
          deleted_at?: string | null;
          excerpt?: string | null;
          featured?: boolean;
          id?: string;
          published_at?: string | null;
          reading_minutes?: number;
          scheduled_at?: string | null;
          seo_description?: string | null;
          seo_title?: string | null;
          slug?: string;
          status?: string;
          title?: string;
          updated_at?: string;
          visibility?: string;
        };
        Relationships: [
          {
            foreignKeyName: "posts_author_id_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "authors";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          display_name: string;
          id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          display_name?: string;
          id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          display_name?: string;
          id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      roles: {
        Row: {
          id: string;
          name: string;
        };
        Insert: {
          id?: string;
          name: string;
        };
        Update: {
          id?: string;
          name?: string;
        };
        Relationships: [];
      };
      site_settings: {
        Row: {
          is_public: boolean;
          key: string;
          updated_at: string;
          value: Json;
        };
        Insert: {
          is_public?: boolean;
          key: string;
          updated_at?: string;
          value: Json;
        };
        Update: {
          is_public?: boolean;
          key?: string;
          updated_at?: string;
          value?: Json;
        };
        Relationships: [];
      };
      ticker_items: {
        Row: {
          created_at: string;
          ends_at: string | null;
          id: string;
          is_active: boolean;
          sort_order: number;
          starts_at: string;
          text: string;
          updated_at: string;
          url: string | null;
        };
        Insert: {
          created_at?: string;
          ends_at?: string | null;
          id?: string;
          is_active?: boolean;
          sort_order?: number;
          starts_at?: string;
          text: string;
          updated_at?: string;
          url?: string | null;
        };
        Update: {
          created_at?: string;
          ends_at?: string | null;
          id?: string;
          is_active?: boolean;
          sort_order?: number;
          starts_at?: string;
          text?: string;
          updated_at?: string;
          url?: string | null;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          role_id: string;
          user_id: string;
        };
        Insert: {
          role_id: string;
          user_id: string;
        };
        Update: {
          role_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_roles_role_id_fkey";
            columns: ["role_id"];
            isOneToOne: false;
            referencedRelation: "roles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      consume_rate_limit: {
        Args: { p_key: string; p_limit: number; p_seconds: number };
        Returns: boolean;
      };
      set_account_pin: {
        Args: { p_hash: string; p_user_id: string };
        Returns: undefined;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
