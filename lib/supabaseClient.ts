import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Database = {
  public: {
    Tables: {
      math_problem_sessions: {
        Row: {
          id: string
          created_at: string
          problem_text: string
          correct_answer: number
          hint: string | null
          difficulty: string
          topic: string
        }
        Insert: {
          id?: string
          created_at?: string
          problem_text: string
          correct_answer: number
          hint?: string
          difficulty?: string
          topic?: string
        }
        Update: {
          id?: string
          created_at?: string
          problem_text?: string
          correct_answer?: number
          hint?: string
          difficulty?: string
          topic?: string
        }
      }
      math_problem_submissions: {
        Row: {
          id: string
          session_id: string
          user_answer: number
          is_correct: boolean
          feedback_text: string
          time_taken_seconds: number | null
          stars_earned: number | null
        }
        Insert: {
          id?: string
          session_id: string
          user_answer: number
          is_correct: boolean
          feedback_text: string
          time_taken_seconds?: number
          stars_earned?: number
        }
        Update: {
          id?: string
          session_id?: string
          user_answer?: number
          is_correct?: boolean
          feedback_text?: string
          time_taken_seconds?: number
          stars_earned?: number
        }
      }
    }
  }
}