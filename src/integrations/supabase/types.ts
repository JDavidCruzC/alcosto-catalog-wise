export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      comparaciones: {
        Row: {
          agregados: number
          cambios_condicion: number
          cambios_precio: number
          created_at: string
          eliminados: number
          fecha_base: string | null
          fecha_nueva: string | null
          id: string
          ms_procesamiento: number
          nombre_archivo_base: string | null
          nombre_archivo_generado: string
          nombre_archivo_nuevo: string | null
          nuevos: number
          refurbished: number
          total_curr: number
          total_prev: number
        }
        Insert: {
          agregados?: number
          cambios_condicion?: number
          cambios_precio?: number
          created_at?: string
          eliminados?: number
          fecha_base?: string | null
          fecha_nueva?: string | null
          id?: string
          ms_procesamiento?: number
          nombre_archivo_base?: string | null
          nombre_archivo_generado: string
          nombre_archivo_nuevo?: string | null
          nuevos?: number
          refurbished?: number
          total_curr?: number
          total_prev?: number
        }
        Update: {
          agregados?: number
          cambios_condicion?: number
          cambios_precio?: number
          created_at?: string
          eliminados?: number
          fecha_base?: string | null
          fecha_nueva?: string | null
          id?: string
          ms_procesamiento?: number
          nombre_archivo_base?: string | null
          nombre_archivo_generado?: string
          nombre_archivo_nuevo?: string | null
          nuevos?: number
          refurbished?: number
          total_curr?: number
          total_prev?: number
        }
        Relationships: []
      }
      marcas_cache: {
        Row: {
          created_at: string
          image_hash: string
          marca: string
        }
        Insert: {
          created_at?: string
          image_hash: string
          marca: string
        }
        Update: {
          created_at?: string
          image_hash?: string
          marca?: string
        }
        Relationships: []
      }
      productos_comparacion: {
        Row: {
          codigo: string | null
          comparacion_id: string
          condicion_curr: string | null
          condicion_prev: string | null
          descripcion: string | null
          diferencia: number | null
          estado: string
          id: number
          marca: string | null
          observacion: string | null
          orden: number
          part_number: string | null
          precio_curr: number | null
          precio_prev: number | null
          variacion_pct: number | null
        }
        Insert: {
          codigo?: string | null
          comparacion_id: string
          condicion_curr?: string | null
          condicion_prev?: string | null
          descripcion?: string | null
          diferencia?: number | null
          estado: string
          id?: number
          marca?: string | null
          observacion?: string | null
          orden?: number
          part_number?: string | null
          precio_curr?: number | null
          precio_prev?: number | null
          variacion_pct?: number | null
        }
        Update: {
          codigo?: string | null
          comparacion_id?: string
          condicion_curr?: string | null
          condicion_prev?: string | null
          descripcion?: string | null
          diferencia?: number | null
          estado?: string
          id?: number
          marca?: string | null
          observacion?: string | null
          orden?: number
          part_number?: string | null
          precio_curr?: number | null
          precio_prev?: number | null
          variacion_pct?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "productos_comparacion_comparacion_id_fkey"
            columns: ["comparacion_id"]
            isOneToOne: false
            referencedRelation: "comparaciones"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
