import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(req: NextRequest) {
  const { email, password } = await req.json()

  const { data, error } = await supabase
    .from('admins')
    .select('*')
    .eq('email', email)
    .eq('password_hash', password)
    .single()

  if (error || !data) {
    return NextResponse.json({ success: false }, { status: 401 })
  }

  return NextResponse.json({ success: true })
}
