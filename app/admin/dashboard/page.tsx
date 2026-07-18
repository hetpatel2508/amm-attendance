'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase, type Employee, type Attendance } from '@/lib/supabase'
import { Users, Clock, UserPlus, LogOut, Calendar, Check, X, Search, ChevronDown } from 'lucide-react'
import { useRouter } from 'next/navigation'

type Tab = 'overview' | 'employees' | 'attendance'

type AttendanceWithEmployee = Attendance & { employees: Employee }

export default function AdminDashboard() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [employees, setEmployees] = useState<Employee[]>([])
  const [attendance, setAttendance] = useState<AttendanceWithEmployee[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [searchEmp, setSearchEmp] = useState('')

  // Add Employee state
  const [showAddForm, setShowAddForm] = useState(false)
  const [newEmp, setNewEmp] = useState({ employee_code: '', name: '', email: '', department: '', position: '' })
  const [addLoading, setAddLoading] = useState(false)
  const [addError, setAddError] = useState('')

  const fetchEmployees = useCallback(async () => {
    const { data } = await supabase.from('employees').select('*').order('created_at', { ascending: false })
    setEmployees(data || [])
  }, [])

  const fetchAttendance = useCallback(async () => {
    const { data } = await supabase
      .from('attendance')
      .select('*, employees(*)')
      .eq('work_date', selectedDate)
      .order('punch_in', { ascending: false })
    setAttendance((data as AttendanceWithEmployee[]) || [])
  }, [selectedDate])

  useEffect(() => {
    const init = async () => {
      setLoading(true)
      await Promise.all([fetchEmployees(), fetchAttendance()])
      setLoading(false)
    }
    init()
  }, [fetchEmployees, fetchAttendance])

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault()
    setAddLoading(true)
    setAddError('')
    const { error } = await supabase.from('employees').insert({
      ...newEmp,
      employee_code: newEmp.employee_code.toUpperCase(),
    })
    if (error) {
      setAddError(error.message.includes('duplicate') ? 'Employee code or email already exists.' : error.message)
    } else {
      setNewEmp({ employee_code: '', name: '', email: '', department: '', position: '' })
      setShowAddForm(false)
      await fetchEmployees()
    }
    setAddLoading(false)
  }

  const toggleEmployee = async (emp: Employee) => {
    await supabase.from('employees').update({ is_active: !emp.is_active }).eq('id', emp.id)
    await fetchEmployees()
  }

  const formatTime = (iso: string | null) =>
    iso ? new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : '—'

  const getDuration = (att: Attendance) => {
    if (!att.punch_in || !att.punch_out) return '—'
    const diff = Math.floor((new Date(att.punch_out).getTime() - new Date(att.punch_in).getTime()) / 60000)
    return `${Math.floor(diff / 60)}h ${diff % 60}m`
  }

  const todayPresent = attendance.filter(a => a.punch_in).length
  const activeEmpCount = employees.filter(e => e.is_active).length
  const filteredEmployees = employees.filter(e =>
    e.name.toLowerCase().includes(searchEmp.toLowerCase()) ||
    e.employee_code.toLowerCase().includes(searchEmp.toLowerCase())
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white text-lg flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
          Loading dashboard...
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Topbar */}
      <header className="bg-slate-800 border-b border-slate-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center">
              <Clock className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-white">AMM Admin</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-slate-400 text-sm hidden sm:block">hetpatel2508's Project</span>
            <button
              onClick={() => router.push('/')}
              className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors text-sm"
            >
              <LogOut className="w-4 h-4" />
              Exit
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Tabs */}
        <div className="flex gap-1 bg-slate-800 rounded-xl p-1 mb-6 w-fit">
          {(['overview', 'employees', 'attendance'] as Tab[]).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${activeTab === tab ? 'bg-blue-500 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Overview */}
        {activeTab === 'overview' && (
          <div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              <StatCard icon={<Users className="w-5 h-5" />} label="Total Employees" value={activeEmpCount} color="blue" />
              <StatCard icon={<Check className="w-5 h-5" />} label="Present Today" value={todayPresent} color="green" />
              <StatCard icon={<X className="w-5 h-5" />} label="Absent Today" value={activeEmpCount - todayPresent} color="red" />
            </div>

            <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-700 flex items-center justify-between">
                <h3 className="font-semibold">Today's Attendance — {new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}</h3>
              </div>
              {attendance.length === 0 ? (
                <div className="py-12 text-center text-slate-500">No attendance records for today.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-700 text-slate-400">
                        <th className="text-left px-5 py-3">Employee</th>
                        <th className="text-left px-5 py-3">Punch In</th>
                        <th className="text-left px-5 py-3">Punch Out</th>
                        <th className="text-left px-5 py-3">Duration</th>
                        <th className="text-left px-5 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attendance.map(att => (
                        <tr key={att.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                          <td className="px-5 py-3">
                            <div className="font-medium">{att.employees?.name}</div>
                            <div className="text-slate-500 text-xs">{att.employees?.employee_code}</div>
                          </td>
                          <td className="px-5 py-3 text-emerald-400">{formatTime(att.punch_in)}</td>
                          <td className="px-5 py-3 text-amber-400">{formatTime(att.punch_out)}</td>
                          <td className="px-5 py-3 text-slate-300">{getDuration(att)}</td>
                          <td className="px-5 py-3">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${att.punch_out ? 'bg-slate-600 text-slate-300' : 'bg-emerald-500/20 text-emerald-400'}`}>
                              {att.punch_out ? 'Checked Out' : 'Active'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Employees */}
        {activeTab === 'employees' && (
          <div>
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  value={searchEmp}
                  onChange={e => setSearchEmp(e.target.value)}
                  placeholder="Search employees..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2.5 rounded-xl font-medium transition-colors"
              >
                <UserPlus className="w-4 h-4" />
                Add Employee
              </button>
            </div>

            {showAddForm && (
              <form onSubmit={handleAddEmployee} className="bg-slate-800 rounded-2xl border border-slate-700 p-5 mb-4">
                <h3 className="font-semibold mb-4 text-blue-400">New Employee</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                  {[
                    { key: 'employee_code', label: 'Employee Code', placeholder: 'EMP004' },
                    { key: 'name', label: 'Full Name', placeholder: 'John Doe' },
                    { key: 'email', label: 'Email', placeholder: 'john@company.com' },
                    { key: 'department', label: 'Department', placeholder: 'Engineering' },
                    { key: 'position', label: 'Position', placeholder: 'Developer' },
                  ].map(field => (
                    <div key={field.key}>
                      <label className="text-slate-400 text-xs mb-1 block">{field.label}</label>
                      <input
                        type={field.key === 'email' ? 'email' : 'text'}
                        required={field.key !== 'department' && field.key !== 'position'}
                        placeholder={field.placeholder}
                        value={newEmp[field.key as keyof typeof newEmp]}
                        onChange={e => setNewEmp(prev => ({ ...prev, [field.key]: e.target.value }))}
                        className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  ))}
                </div>
                {addError && <p className="text-red-400 text-sm mb-3">{addError}</p>}
                <div className="flex gap-2">
                  <button type="submit" disabled={addLoading} className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50">
                    {addLoading ? 'Adding...' : 'Add Employee'}
                  </button>
                  <button type="button" onClick={() => setShowAddForm(false)} className="bg-slate-700 hover:bg-slate-600 text-slate-300 px-4 py-2 rounded-lg text-sm">
                    Cancel
                  </button>
                </div>
              </form>
            )}

            <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700 text-slate-400">
                      <th className="text-left px-5 py-3">Employee</th>
                      <th className="text-left px-5 py-3">Code</th>
                      <th className="text-left px-5 py-3">Department</th>
                      <th className="text-left px-5 py-3">Position</th>
                      <th className="text-left px-5 py-3">Status</th>
                      <th className="text-left px-5 py-3">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEmployees.map(emp => (
                      <tr key={emp.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-violet-400 flex items-center justify-center text-white font-bold text-xs">
                              {emp.name.charAt(0)}
                            </div>
                            <div>
                              <div className="font-medium">{emp.name}</div>
                              <div className="text-slate-500 text-xs">{emp.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3 font-mono text-blue-400">{emp.employee_code}</td>
                        <td className="px-5 py-3 text-slate-300">{emp.department || '—'}</td>
                        <td className="px-5 py-3 text-slate-300">{emp.position || '—'}</td>
                        <td className="px-5 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${emp.is_active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                            {emp.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <button
                            onClick={() => toggleEmployee(emp)}
                            className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${emp.is_active ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'}`}
                          >
                            {emp.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredEmployees.length === 0 && (
                  <div className="py-12 text-center text-slate-500">No employees found.</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Attendance Records */}
        {activeTab === 'attendance' && (
          <div>
            <div className="flex gap-3 mb-4">
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={e => setSelectedDate(e.target.value)}
                  className="bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                onClick={fetchAttendance}
                className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2.5 rounded-xl text-sm transition-colors"
              >
                Refresh
              </button>
            </div>

            <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-700">
                <h3 className="font-semibold">
                  Attendance — {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </h3>
                <p className="text-slate-400 text-sm mt-0.5">{attendance.length} record(s)</p>
              </div>
              {attendance.length === 0 ? (
                <div className="py-12 text-center text-slate-500">No attendance records for this date.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-700 text-slate-400">
                        <th className="text-left px-5 py-3">Employee</th>
                        <th className="text-left px-5 py-3">Punch In</th>
                        <th className="text-left px-5 py-3">Punch Out</th>
                        <th className="text-left px-5 py-3">Duration</th>
                        <th className="text-left px-5 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attendance.map(att => (
                        <tr key={att.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                          <td className="px-5 py-3">
                            <div className="font-medium">{att.employees?.name}</div>
                            <div className="text-slate-500 text-xs">{att.employees?.department} · {att.employees?.position}</div>
                          </td>
                          <td className="px-5 py-3 text-emerald-400 font-medium">{formatTime(att.punch_in)}</td>
                          <td className="px-5 py-3 text-amber-400 font-medium">{formatTime(att.punch_out)}</td>
                          <td className="px-5 py-3 text-slate-300">{getDuration(att)}</td>
                          <td className="px-5 py-3">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${att.punch_out ? 'bg-slate-600 text-slate-300' : 'bg-emerald-500/20 text-emerald-400'}`}>
                              {att.punch_out ? 'Completed' : 'Still In'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-500/20 text-blue-400',
    green: 'bg-emerald-500/20 text-emerald-400',
    red: 'bg-red-500/20 text-red-400',
  }
  return (
    <div className="bg-slate-800 rounded-2xl border border-slate-700 p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colors[color]}`}>{icon}</div>
      <div>
        <div className="text-slate-400 text-sm">{label}</div>
        <div className="text-3xl font-bold text-white">{value}</div>
      </div>
    </div>
  )
}
