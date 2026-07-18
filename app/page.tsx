'use client'

import { useState, useEffect } from 'react'
import { supabase, type Employee, type Attendance } from '@/lib/supabase'
import { Clock, LogIn, LogOut, CheckCircle, AlertCircle, Shield } from 'lucide-react'
import Link from 'next/link'

export default function EmployeePage() {
  const [employeeCode, setEmployeeCode] = useState('')
  const [employee, setEmployee] = useState<Employee | null>(null)
  const [todayAttendance, setTodayAttendance] = useState<Attendance | null>(null)
  const [loading, setLoading] = useState(false)
  const [searching, setSearching] = useState(false)
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const searchEmployee = async () => {
    if (!employeeCode.trim()) return
    setSearching(true)
    setEmployee(null)
    setTodayAttendance(null)
    setMessage(null)

    const { data: emp, error } = await supabase
      .from('employees')
      .select('*')
      .eq('employee_code', employeeCode.toUpperCase().trim())
      .eq('is_active', true)
      .single()

    if (error || !emp) {
      setMessage({ text: 'Employee not found. Please check your ID.', type: 'error' })
      setSearching(false)
      return
    }

    setEmployee(emp)

    const today = new Date().toISOString().split('T')[0]
    const { data: att } = await supabase
      .from('attendance')
      .select('*')
      .eq('employee_id', emp.id)
      .eq('work_date', today)
      .single()

    setTodayAttendance(att || null)
    setSearching(false)
  }

  const handlePunchIn = async () => {
    if (!employee) return
    setLoading(true)
    const today = new Date().toISOString().split('T')[0]
    const { error } = await supabase.from('attendance').insert({
      employee_id: employee.id,
      punch_in: new Date().toISOString(),
      work_date: today,
    })
    if (error) {
      setMessage({ text: 'Failed to punch in. Please try again.', type: 'error' })
    } else {
      setMessage({ text: `Welcome, ${employee.name}! Punched in successfully.`, type: 'success' })
      const { data: att } = await supabase
        .from('attendance')
        .select('*')
        .eq('employee_id', employee.id)
        .eq('work_date', today)
        .single()
      setTodayAttendance(att || null)
    }
    setLoading(false)
  }

  const handlePunchOut = async () => {
    if (!employee || !todayAttendance) return
    setLoading(true)
    const { error } = await supabase
      .from('attendance')
      .update({ punch_out: new Date().toISOString() })
      .eq('id', todayAttendance.id)
    if (error) {
      setMessage({ text: 'Failed to punch out. Please try again.', type: 'error' })
    } else {
      setMessage({ text: `Goodbye, ${employee.name}! Have a great day!`, type: 'success' })
      const today = new Date().toISOString().split('T')[0]
      const { data: att } = await supabase
        .from('attendance')
        .select('*')
        .eq('employee_id', employee.id)
        .eq('work_date', today)
        .single()
      setTodayAttendance(att || null)
    }
    setLoading(false)
  }

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })

  const getWorkDuration = () => {
    if (!todayAttendance?.punch_in) return null
    const end = todayAttendance.punch_out ? new Date(todayAttendance.punch_out) : new Date()
    const diff = Math.floor((end.getTime() - new Date(todayAttendance.punch_in).getTime()) / 60000)
    const h = Math.floor(diff / 60)
    const m = diff % 60
    return `${h}h ${m}m`
  }

  const isPunchedIn = !!todayAttendance?.punch_in && !todayAttendance?.punch_out
  const isPunchedOut = !!todayAttendance?.punch_out

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex flex-col">
      <header className="border-b border-white/10 backdrop-blur-sm bg-white/5">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center">
              <Clock className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-white font-bold text-lg leading-tight">AMM</h1>
              <p className="text-blue-300 text-xs">Attendance Management System</p>
            </div>
          </div>
          <Link
            href="/admin"
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm"
          >
            <Shield className="w-4 h-4" />
            Admin
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="text-5xl font-bold text-white tabular-nums">
              {currentTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
            </div>
            <div className="text-blue-300 mt-1">
              {currentTime.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-6 shadow-2xl">
            <h2 className="text-white font-semibold text-lg mb-4 text-center">Employee Check-In / Check-Out</h2>

            <div className="flex gap-2 mb-4">
              <input
                type="text"
                placeholder="Enter Employee Code (e.g. EMP001)"
                value={employeeCode}
                onChange={e => setEmployeeCode(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && searchEmployee()}
                className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
              />
              <button
                onClick={searchEmployee}
                disabled={searching}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-3 rounded-xl font-medium transition-colors disabled:opacity-50"
              >
                {searching ? '...' : 'Find'}
              </button>
            </div>

            {message && (
              <div className={`flex items-center gap-2 rounded-xl p-3 mb-4 text-sm ${message.type === 'success' ? 'bg-green-500/20 text-green-300 border border-green-500/30' : 'bg-red-500/20 text-red-300 border border-red-500/30'}`}>
                {message.type === 'success' ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                {message.text}
              </div>
            )}

            {employee && (
              <div className="mt-2">
                <div className="bg-white/5 rounded-xl p-4 mb-4 border border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-violet-400 flex items-center justify-center text-white font-bold text-lg">
                      {employee.name.charAt(0)}
                    </div>
                    <div>
                      <div className="text-white font-semibold">{employee.name}</div>
                      <div className="text-slate-400 text-sm">{employee.position} · {employee.department}</div>
                      <div className="text-slate-500 text-xs">{employee.employee_code}</div>
                    </div>
                  </div>

                  {todayAttendance && (
                    <div className="mt-3 pt-3 border-t border-white/10 grid grid-cols-3 gap-2 text-center">
                      <div>
                        <div className="text-xs text-slate-400">Punch In</div>
                        <div className="text-white text-sm font-medium">
                          {todayAttendance.punch_in ? formatTime(todayAttendance.punch_in) : '—'}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-400">Punch Out</div>
                        <div className="text-white text-sm font-medium">
                          {todayAttendance.punch_out ? formatTime(todayAttendance.punch_out) : '—'}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-400">Duration</div>
                        <div className="text-white text-sm font-medium">{getWorkDuration() || '—'}</div>
                      </div>
                    </div>
                  )}
                </div>

                {!isPunchedIn && !isPunchedOut && (
                  <button
                    onClick={handlePunchIn}
                    disabled={loading}
                    className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-3.5 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                  >
                    <LogIn className="w-5 h-5" />
                    {loading ? 'Processing...' : 'Punch In'}
                  </button>
                )}
                {isPunchedIn && (
                  <button
                    onClick={handlePunchOut}
                    disabled={loading}
                    className="w-full bg-amber-500 hover:bg-amber-600 text-white py-3.5 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                  >
                    <LogOut className="w-5 h-5" />
                    {loading ? 'Processing...' : 'Punch Out'}
                  </button>
                )}
                {isPunchedOut && (
                  <div className="w-full bg-slate-700 text-slate-300 py-3.5 rounded-xl font-semibold flex items-center justify-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                    Attendance Marked for Today
                  </div>
                )}
              </div>
            )}
          </div>

          <p className="text-center text-slate-500 text-xs mt-4">
            Enter your employee code and press Find to check in or out
          </p>
        </div>
      </main>
    </div>
  )
}
