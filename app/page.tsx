'use client'

import { useState, useEffect } from 'react'
import { supabase, type Employee, type Attendance } from '@/lib/supabase'
import { Clock, LogIn, LogOut, CheckCircle, AlertCircle, Shield, Search } from 'lucide-react'
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
      const { data: att } = await supabase.from('attendance').select('*').eq('employee_id', employee.id).eq('work_date', today).single()
      setTodayAttendance(att || null)
    }
    setLoading(false)
  }

  const handlePunchOut = async () => {
    if (!employee || !todayAttendance) return
    setLoading(true)
    const { error } = await supabase.from('attendance').update({ punch_out: new Date().toISOString() }).eq('id', todayAttendance.id)
    if (error) {
      setMessage({ text: 'Failed to punch out. Please try again.', type: 'error' })
    } else {
      setMessage({ text: `Goodbye, ${employee.name}! Have a great day!`, type: 'success' })
      const today = new Date().toISOString().split('T')[0]
      const { data: att } = await supabase.from('attendance').select('*').eq('employee_id', employee.id).eq('work_date', today).single()
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
    return `${Math.floor(diff / 60)}h ${diff % 60}m`
  }

  const isPunchedIn = !!todayAttendance?.punch_in && !todayAttendance?.punch_out
  const isPunchedOut = !!todayAttendance?.punch_out

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center shadow-sm">
              <Clock className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="font-bold text-slate-800 text-base tracking-tight">AMM</span>
              <span className="text-slate-400 text-xs ml-2 hidden sm:inline">Attendance Management System</span>
            </div>
          </div>
          <Link
            href="/admin"
            className="flex items-center gap-1.5 text-slate-500 hover:text-indigo-600 text-sm font-medium transition-colors px-3 py-1.5 rounded-lg hover:bg-indigo-50"
          >
            <Shield className="w-3.5 h-3.5" />
            Admin Portal
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">

          {/* Time Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 mb-4 text-center">
            <div className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 text-xs font-semibold px-3 py-1 rounded-full mb-4 border border-emerald-100">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
              Live
            </div>
            <div className="text-6xl font-bold text-slate-800 tabular-nums tracking-tight">
              {currentTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
            </div>
            <div className="text-slate-500 mt-2 text-sm">
              {currentTime.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
          </div>

          {/* Check-in Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-slate-800 font-semibold text-base mb-1">Employee Check-In / Check-Out</h2>
            <p className="text-slate-400 text-xs mb-4">Enter your employee code to mark attendance</p>

            <div className="flex gap-2 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="e.g. EMP001"
                  value={employeeCode}
                  onChange={e => setEmployeeCode(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && searchEmployee()}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-slate-800 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent focus:bg-white transition"
                />
              </div>
              <button
                onClick={searchEmployee}
                disabled={searching}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl font-medium text-sm transition-colors disabled:opacity-50 shadow-sm"
              >
                {searching ? '...' : 'Find'}
              </button>
            </div>

            {/* Message */}
            {message && (
              <div className={`flex items-start gap-2 rounded-xl p-3 mb-4 text-sm border ${
                message.type === 'success'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                  : 'bg-red-50 text-red-600 border-red-100'
              }`}>
                {message.type === 'success'
                  ? <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  : <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />}
                {message.text}
              </div>
            )}

            {/* Employee Card */}
            {employee && (
              <div>
                <div className="bg-slate-50 rounded-xl p-4 mb-4 border border-slate-100">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-lg shadow-sm flex-shrink-0">
                      {employee.name.charAt(0)}
                    </div>
                    <div>
                      <div className="text-slate-800 font-semibold text-sm">{employee.name}</div>
                      <div className="text-slate-500 text-xs">{employee.position}{employee.department ? ` · ${employee.department}` : ''}</div>
                      <span className="inline-block bg-indigo-100 text-indigo-700 text-xs font-mono px-1.5 py-0.5 rounded mt-0.5">{employee.employee_code}</span>
                    </div>
                  </div>

                  {todayAttendance && (
                    <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-200">
                      {[
                        { label: 'Punch In', value: todayAttendance.punch_in ? formatTime(todayAttendance.punch_in) : '—', color: 'text-emerald-600' },
                        { label: 'Punch Out', value: todayAttendance.punch_out ? formatTime(todayAttendance.punch_out) : '—', color: 'text-amber-600' },
                        { label: 'Duration', value: getWorkDuration() || '—', color: 'text-indigo-600' },
                      ].map(item => (
                        <div key={item.label} className="text-center">
                          <div className="text-slate-400 text-xs mb-0.5">{item.label}</div>
                          <div className={`font-semibold text-sm ${item.color}`}>{item.value}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {!isPunchedIn && !isPunchedOut && (
                  <button
                    onClick={handlePunchIn}
                    disabled={loading}
                    className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50 shadow-sm"
                  >
                    <LogIn className="w-4 h-4" />
                    {loading ? 'Processing...' : 'Punch In'}
                  </button>
                )}
                {isPunchedIn && (
                  <button
                    onClick={handlePunchOut}
                    disabled={loading}
                    className="w-full bg-amber-500 hover:bg-amber-600 text-white py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50 shadow-sm"
                  >
                    <LogOut className="w-4 h-4" />
                    {loading ? 'Processing...' : 'Punch Out'}
                  </button>
                )}
                {isPunchedOut && (
                  <div className="w-full bg-slate-100 text-slate-500 py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 border border-slate-200">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    Attendance Complete for Today
                  </div>
                )}
              </div>
            )}
          </div>

          <p className="text-center text-slate-400 text-xs mt-4">
            AMM · Attendance Management System
          </p>
        </div>
      </main>
    </div>
  )
}
