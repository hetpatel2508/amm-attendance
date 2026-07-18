import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Employee = {
  id: string
  employee_code: string
  name: string
  email: string
  department: string | null
  position: string | null
  is_active: boolean
  created_at: string
}

export type Attendance = {
  id: string
  employee_id: string
  punch_in: string | null
  punch_out: string | null
  work_date: string
  notes: string | null
  created_at: string
  employees?: Employee
}
