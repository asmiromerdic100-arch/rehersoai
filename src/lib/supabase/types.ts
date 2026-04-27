/**
 * Hand-written types matching the schema in supabase/migrations/.
 *
 * Once your Supabase project is set up, regenerate this file with:
 *   pnpm db:types
 *
 * That command runs `supabase gen types typescript` and will overwrite this file
 * with auto-generated types that exactly match your DB. Until then, these
 * hand-written types keep the app type-safe.
 */

export type UserRole = 'SDR' | 'BDR' | 'AE' | 'other';
export type ScenarioCategory =
  | 'cold_call'
  | 'discovery'
  | 'objection'
  | 'closing'
  | 'demo';
export type ScenarioDifficulty = 'beginner' | 'intermediate' | 'advanced';
export type SubmissionMode = 'audio' | 'text' | 'video';
export type AttemptStatus = 'processing' | 'complete' | 'failed';

export interface Json {
  [key: string]: unknown;
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          role: UserRole | null;
          experience_months: number | null;
          primary_goal: string | null;
          onboarded_at: string | null;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['profiles']['Row']> & { id: string };
        Update: Partial<Database['public']['Tables']['profiles']['Row']>;
      };
      skills: {
        Row: {
          id: string;
          slug: string;
          name: string;
          description: string | null;
          display_order: number;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['skills']['Row'], 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['skills']['Row']>;
      };
      scenarios: {
        Row: {
          id: string;
          slug: string;
          title: string;
          category: ScenarioCategory;
          difficulty: ScenarioDifficulty;
          description: string;
          buyer_context: string;
          user_goal: string;
          challenge_prompt: string;
          rubric: Json;
          is_active: boolean;
          created_at: string;
        };
        Insert: Omit<
          Database['public']['Tables']['scenarios']['Row'],
          'id' | 'created_at' | 'is_active'
        > & {
          id?: string;
          created_at?: string;
          is_active?: boolean;
        };
        Update: Partial<Database['public']['Tables']['scenarios']['Row']>;
      };
      scenario_skills: {
        Row: {
          scenario_id: string;
          skill_id: string;
          weight: number;
        };
        Insert: Database['public']['Tables']['scenario_skills']['Row'];
        Update: Partial<Database['public']['Tables']['scenario_skills']['Row']>;
      };
      attempts: {
        Row: {
          id: string;
          user_id: string;
          scenario_id: string;
          attempt_number: number;
          submission_mode: SubmissionMode;
          audio_path: string | null;
          video_path: string | null;
          transcript: string | null;
          duration_seconds: number | null;
          status: AttemptStatus;
          error_message: string | null;
          created_at: string;
          completed_at: string | null;
        };
        Insert: Omit<
          Database['public']['Tables']['attempts']['Row'],
          'id' | 'attempt_number' | 'status' | 'created_at' | 'completed_at' | 'error_message'
        > & {
          id?: string;
          attempt_number?: number;
          status?: AttemptStatus;
          created_at?: string;
          completed_at?: string | null;
          error_message?: string | null;
        };
        Update: Partial<Database['public']['Tables']['attempts']['Row']>;
      };
      feedback: {
        Row: {
          id: string;
          attempt_id: string;
          overall_score: number;
          category_scores: Json;
          strengths: string[];
          weaknesses: string[];
          suggestions: string[];
          transcript_annotations: Json;
          delivery_metrics: Json | null;
          model_used: string;
          user_rating: number | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['feedback']['Row'], 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['feedback']['Row']>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      user_role: UserRole;
      scenario_category: ScenarioCategory;
      scenario_difficulty: ScenarioDifficulty;
      submission_mode: SubmissionMode;
      attempt_status: AttemptStatus;
    };
  };
}
