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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          ip_address: unknown
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          table_name: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          ip_address?: unknown
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          ip_address?: unknown
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string
          user_id?: string | null
        }
        Relationships: []
      }
      co_po_mappings: {
        Row: {
          co_id: string
          correlation_level: number
          id: string
          po_id: string
        }
        Insert: {
          co_id: string
          correlation_level: number
          id?: string
          po_id: string
        }
        Update: {
          co_id?: string
          correlation_level?: number
          id?: string
          po_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "co_po_mappings_co_id_fkey"
            columns: ["co_id"]
            isOneToOne: false
            referencedRelation: "course_outcomes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "co_po_mappings_po_id_fkey"
            columns: ["po_id"]
            isOneToOne: false
            referencedRelation: "program_outcomes"
            referencedColumns: ["id"]
          },
        ]
      }
      cohorts: {
        Row: {
          created_at: string
          current_semester: number
          id: string
          name: string
          program_id: string
          year: number
        }
        Insert: {
          created_at?: string
          current_semester?: number
          id?: string
          name: string
          program_id: string
          year: number
        }
        Update: {
          created_at?: string
          current_semester?: number
          id?: string
          name?: string
          program_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "cohorts_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      course_outcomes: {
        Row: {
          bloom_level: string
          co_number: number
          created_at: string
          description: string
          id: string
          subject_id: string
        }
        Insert: {
          bloom_level: string
          co_number: number
          created_at?: string
          description: string
          id?: string
          subject_id: string
        }
        Update: {
          bloom_level?: string
          co_number?: number
          created_at?: string
          description?: string
          id?: string
          subject_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_outcomes_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      curriculum_versions: {
        Row: {
          created_at: string
          effective_from: number
          id: string
          is_active: boolean
          program_id: string
          version_name: string
        }
        Insert: {
          created_at?: string
          effective_from: number
          id?: string
          is_active?: boolean
          program_id: string
          version_name: string
        }
        Update: {
          created_at?: string
          effective_from?: number
          id?: string
          is_active?: boolean
          program_id?: string
          version_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "curriculum_versions_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          code: string
          created_at: string
          hod_id: string | null
          id: string
          name: string
        }
        Insert: {
          code: string
          created_at?: string
          hod_id?: string | null
          id?: string
          name: string
        }
        Update: {
          code?: string
          created_at?: string
          hod_id?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      exam_sections: {
        Row: {
          created_at: string
          exam_id: string
          id: string
          max_marks: number
          name: string
          required_questions: number
          selection_mode: string
          sequence: number
        }
        Insert: {
          created_at?: string
          exam_id: string
          id?: string
          max_marks: number
          name: string
          required_questions?: number
          selection_mode?: string
          sequence: number
        }
        Update: {
          created_at?: string
          exam_id?: string
          id?: string
          max_marks?: number
          name?: string
          required_questions?: number
          selection_mode?: string
          sequence?: number
        }
        Relationships: [
          {
            foreignKeyName: "exam_sections_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_snapshots: {
        Row: {
          created_at: string
          created_by: string | null
          exam_id: string
          id: string
          snapshot_data: Json
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          exam_id: string
          id?: string
          snapshot_data: Json
        }
        Update: {
          created_at?: string
          created_by?: string | null
          exam_id?: string
          id?: string
          snapshot_data?: Json
        }
        Relationships: [
          {
            foreignKeyName: "exam_snapshots_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
        ]
      }
      exams: {
        Row: {
          cohort_id: string
          created_at: string
          exam_type: string
          id: string
          max_marks: number
          published_at: string | null
          status: string
          subject_id: string
          teacher_id: string | null
        }
        Insert: {
          cohort_id: string
          created_at?: string
          exam_type: string
          id?: string
          max_marks?: number
          published_at?: string | null
          status?: string
          subject_id: string
          teacher_id?: string | null
        }
        Update: {
          cohort_id?: string
          created_at?: string
          exam_type?: string
          id?: string
          max_marks?: number
          published_at?: string | null
          status?: string
          subject_id?: string
          teacher_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exams_cohort_id_fkey"
            columns: ["cohort_id"]
            isOneToOne: false
            referencedRelation: "cohorts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exams_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      marks_computed: {
        Row: {
          computed_at: string
          exam_id: string
          id: string
          selected_questions: Json
          student_id: string
          total_marks: number
        }
        Insert: {
          computed_at?: string
          exam_id: string
          id?: string
          selected_questions?: Json
          student_id: string
          total_marks: number
        }
        Update: {
          computed_at?: string
          exam_id?: string
          id?: string
          selected_questions?: Json
          student_id?: string
          total_marks?: number
        }
        Relationships: [
          {
            foreignKeyName: "marks_computed_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          department: string | null
          email: string
          full_name: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          department?: string | null
          email: string
          full_name: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          department?: string | null
          email?: string
          full_name?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      program_outcomes: {
        Row: {
          created_at: string
          description: string
          id: string
          po_number: number
          program_id: string
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          po_number: number
          program_id: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          po_number?: number
          program_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "program_outcomes_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      programs: {
        Row: {
          code: string
          created_at: string
          department_id: string | null
          duration_years: number
          id: string
          name: string
        }
        Insert: {
          code: string
          created_at?: string
          department_id?: string | null
          duration_years?: number
          id?: string
          name: string
        }
        Update: {
          code?: string
          created_at?: string
          department_id?: string | null
          duration_years?: number
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "programs_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      questions: {
        Row: {
          bloom_level: string
          co_id: string | null
          created_at: string
          group_key: string | null
          id: string
          is_optional: boolean
          max_marks: number
          section_id: string
          sequence: number
        }
        Insert: {
          bloom_level: string
          co_id?: string | null
          created_at?: string
          group_key?: string | null
          id?: string
          is_optional?: boolean
          max_marks: number
          section_id: string
          sequence: number
        }
        Update: {
          bloom_level?: string
          co_id?: string | null
          created_at?: string
          group_key?: string | null
          id?: string
          is_optional?: boolean
          max_marks?: number
          section_id?: string
          sequence?: number
        }
        Relationships: [
          {
            foreignKeyName: "questions_co_id_fkey"
            columns: ["co_id"]
            isOneToOne: false
            referencedRelation: "course_outcomes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questions_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "exam_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      student_enrollments: {
        Row: {
          cohort_id: string
          created_at: string
          id: string
          roll_number: string
          status: string
          student_id: string
        }
        Insert: {
          cohort_id: string
          created_at?: string
          id?: string
          roll_number: string
          status?: string
          student_id: string
        }
        Update: {
          cohort_id?: string
          created_at?: string
          id?: string
          roll_number?: string
          status?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_enrollments_cohort_id_fkey"
            columns: ["cohort_id"]
            isOneToOne: false
            referencedRelation: "cohorts"
            referencedColumns: ["id"]
          },
        ]
      }
      student_marks: {
        Row: {
          entered_at: string
          entered_by: string | null
          exam_id: string
          id: string
          marks: number
          student_id: string
          sub_question_id: string
        }
        Insert: {
          entered_at?: string
          entered_by?: string | null
          exam_id: string
          id?: string
          marks: number
          student_id: string
          sub_question_id: string
        }
        Update: {
          entered_at?: string
          entered_by?: string | null
          exam_id?: string
          id?: string
          marks?: number
          student_id?: string
          sub_question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_marks_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_marks_sub_question_id_fkey"
            columns: ["sub_question_id"]
            isOneToOne: false
            referencedRelation: "sub_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      sub_questions: {
        Row: {
          bloom_level: string
          co_id: string | null
          created_at: string
          id: string
          label: string
          max_marks: number
          question_id: string
        }
        Insert: {
          bloom_level: string
          co_id?: string | null
          created_at?: string
          id?: string
          label: string
          max_marks: number
          question_id: string
        }
        Update: {
          bloom_level?: string
          co_id?: string | null
          created_at?: string
          id?: string
          label?: string
          max_marks?: number
          question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sub_questions_co_id_fkey"
            columns: ["co_id"]
            isOneToOne: false
            referencedRelation: "course_outcomes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sub_questions_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          code: string
          created_at: string
          credits: number
          curriculum_version_id: string | null
          id: string
          name: string
          semester: number
        }
        Insert: {
          code: string
          created_at?: string
          credits?: number
          curriculum_version_id?: string | null
          id?: string
          name: string
          semester: number
        }
        Update: {
          code?: string
          created_at?: string
          credits?: number
          curriculum_version_id?: string | null
          id?: string
          name?: string
          semester?: number
        }
        Relationships: [
          {
            foreignKeyName: "subjects_curriculum_version_id_fkey"
            columns: ["curriculum_version_id"]
            isOneToOne: false
            referencedRelation: "curriculum_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_assignments: {
        Row: {
          academic_year: string
          cohort_id: string
          created_at: string
          id: string
          subject_id: string
          teacher_id: string
        }
        Insert: {
          academic_year: string
          cohort_id: string
          created_at?: string
          id?: string
          subject_id: string
          teacher_id: string
        }
        Update: {
          academic_year?: string
          cohort_id?: string
          created_at?: string
          id?: string
          subject_id?: string
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_assignments_cohort_id_fkey"
            columns: ["cohort_id"]
            isOneToOne: false
            referencedRelation: "cohorts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_assignments_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "principal" | "hod" | "teacher" | "student"
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
    Enums: {
      app_role: ["principal", "hod", "teacher", "student"],
    },
  },
} as const
