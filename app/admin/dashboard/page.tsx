'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase, type Employee, type Attendance } from '@/lib/supabase'
import { Users, Clock, UserPlus, LogOut, Calendar, CheckCircle, XCircle, Search, LayoutDashboard, ClipboardList, UserCog } from 'lucide-react'
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

  const tabs = [
    { key: 'overview' as Tab, label: 'Overview', icon: LayoutDashboard },
    { key: 'employees' as Tab, label: 'Employees', icon: UserCog },
    { key: 'attendance' as Tab, label: 'Attendance', icon: ClipboardList },
  ]

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-500">
          <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
          Loading dashboard...
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top navbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
              <Clock className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="font-bold text-slate-800 text-sm">AMM</span>
              <span className="text-slate-400 text-xs ml-2 hidden sm:inline">Admin Dashboard</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-slate-400 hidden sm:block">
              {new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
            </span>
            <button
              onClick={() => router.push('/')}
              className="flex items-center gap-1.5 text-slate-500 hover:text-red-500 text-sm font-medium transition-colors px-2 py-1.5 rounded-lg hover:bg-red-50"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Exit</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Tabs */}
        <div className="flex gap-1 bg-white rounded-xl border border-slate-200 p-1 mb-6 w-fit shadow-sm">
          {tabs.map(tab => {
            const Icon = tab.icon
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab.key
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* ── OVERVIEW ── */}
        {activeTab === 'overview' && (
          <div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <StatCard icon={<Users className="w-5 h-5" />} label="Total Active Employees" value={activeEmpCount} bg="bg-indigo-50" iconColor="text-indigo-600" valueColor="text-indigo-700" />
              <StatCard icon={<CheckCircle className="w-5 h-5" />} label="Present Today" value={todayPresent} bg="bg-emerald-50" iconColor="text-emerald-600" valueColor="text-emerald-700" />
              <StatCard icon={<XCircle className="w-5 h-5" />} label="Absent Today" value={activeEmpCount - todayPresent} bg="bg-red-50" iconColor="text-red-500" valueColor="text-red-600" />
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-slate-800 text-sm">Today&apos;s Attendance</h3>
                  <p className="text-slate-400 text-xs mt-0.5">
                    {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </p>
                </div>
                <span className="bg-indigo-100 text-indigo-700 text-xs font-semibold px-2.5 py-1 rounded-full">
                  {attendance.length} records
                </span>
              </div>
              {attendance.length === 0 ? (
                <div className="py-16 text-center text-slate-400 text-sm">No attendance records for today.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-xs uppercase tracking-wide">
                        <th className="text-left px-5 py-3 font-semibold">Employee</th>
                        <th className="text-left px-5 py-3 font-semibold">Punch In</th>
                        <th className="text-left px-5 py-3 font-semibold">Punch Out</th>
                        <th className="text-left px-5 py-3 font-semibold">Duration</th>
                        <th className="text-left px-5 py-3 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {attendance.map(att => (
                        <tr key={att.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-400 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                {att.employees?.name?.charAt(0)}
                              </div>
                              <div>
                                <div className="font-medium text-slate-800">{att.employees?.name}</div>
                                <div className="text-slate-400 text-xs">{att.employees?.employee_code}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-emerald-600 font-medium">{formatTime(att.punch_in)}</td>
                          <td className="px-5 py-3.5 text-amber-600 font-medium">{formatTime(att.punch_out)}</td>
                          <td className="px-5 py-3.5 text-slate-600">{getDuration(att)}</td>
                          <td className="px-5 py-3.5">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                              att.punch_out
                                ? 'bg-slate-100 text-slate-600'
                                : 'bg-emerald-100 text-emerald-700'
                            }`}>
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

        {/* ── EMPLOYEES ── */}
        {activeTab === 'employees' && (
          <div>
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  value={searchEmp}
                  onChange={e => setSearchEmp(e.target.value)}
                  placeholder="Search by name or code..."
                  className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-slate-800 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent shadow-sm"
                />
              </div>
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl font-medium text-sm transition-colors shadow-sm"
              >
                <UserPlus className="w-4 h-4" />
                Add Employee
              </button>
            </div>

            {showAddForm && (
              <form onSubmit={handleAddEmployee} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 mb-4">
                <h3 className="font-semibold text-slate-800 text-sm mb-4 flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-indigo-600" />
                  New Employee
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                  {[
                    { key: 'employee_code', label: 'Employee Code *', placeholder: 'EMP004' },
                    { key: 'name', label: 'Full Name *', placeholder: 'John Doe' },
                    { key: 'email', label: 'Email *', placeholder: 'john@company.com' },
                    { key: 'department', label: 'Department', placeholder: 'Engineering' },
                    { key: 'position', label: 'Position', placeholder: 'Developer' },
                  ].map(field => (
                    <div key={field.key}>
                      <label className="text-slate-600 text-xs font-medium mb-1 block">{field.label}</label>
                      <input
                        type={field.key === 'email' ? 'email' : 'text'}
                        required={!['department', 'position'].includes(field.key)}
                        placeholder={field.placeholder}
                        value={newEmp[field.key as keyof typeof newEmp]}
                        onChange={e => setNewEmp(prev => ({ ...prev, [field.key]: e.target.value }))}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white"
                      />
                    </div>
                  ))}
                </div>
                {addError && <p className="text-red-500 text-sm mb-3 bg-red-50 px-3 py-2 rounded-lg border border-red-100">{addError}</p>}
                <div className="flex gap-2">
                  <button type="submit" disabled={addLoading} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors">
                    {addLoading ? 'Adding...' : 'Add Employee'}
                  </button>
                  <button type="button" onClick={() => setShowAddForm(false)} className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-2 rounded-lg text-sm transition-colors">
                    Cancel
                  </button>
                </div>
              </form>
            )}

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-xs uppercase tracking-wide">
                      <th className="text-left px-5 py-3 font-semibold">Employee</th>
                      <th className="text-left px-5 py-3 font-semibold">Code</th>
                      <th className="text-left px-5 py-3 font-semibold">Department</th>
                      <th className="text-left px-5 py-3 font-semibold">Position</th>
                      <th className="text-left px-5 py-3 font-semibold">Status</th>
                      <th className="text-left px-5 py-3 font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredEmployees.map(emp => (
                      <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-400 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                              {emp.name.charAt(0)}
                            </div>
                            <div>
                              <div className="font-medium text-slate-800">{emp.name}</div>
                              <div className="text-slate-400 text-xs">{emp.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="font-mono text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded-md font-semibold">{emp.employee_code}</span>
                        </td>
                        <td className="px-5 py-3.5 text-slate-600">{emp.department || '—'}</td>
                        <td className="px-5 py-3.5 text-slate-600">{emp.position || '—'}</td>
                        <td className="px-5 py-3.5">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                            emp.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'
                          }`}>
                            {emp.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <button
                            onClick={() => toggleEmployee(emp)}
                            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                              emp.is_active
                                ? 'bg-red-50 text-red-500 hover:bg-red-100'
                                : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                            }`}
                          >
                            {emp.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredEmployees.length === 0 && (
                  <div className="py-16 text-center text-slate-400 text-sm">No employees found.</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── ATTENDANCE ── */}
        {activeTab === 'attendance' && (
          <div>
            <div className="flex gap-3 mb-4">
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={e => setSelectedDate(e.target.value)}
                  className="bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 shadow-sm"
                />
              </div>
              <button
                onClick={fetchAttendance}
                className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors shadow-sm"
              >
                Refresh
              </button>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-slate-800 text-sm">Attendance Records</h3>
                  <p className="text-slate-400 text-xs mt-0.5">
                    {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
                <span className="bg-indigo-100 text-indigo-700 text-xs font-semibold px-2.5 py-1 rounded-full">
                  {attendance.length} records
                </span>
              </div>
              {attendance.length === 0 ? (
                <div className="py-16 text-center text-slate-400 text-sm">No records for this date.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-xs uppercase tracking-wide">
                        <th className="text-left px-5 py-3 font-semibold">Employee</th>
                        <th className="text-left px-5 py-3 font-semibold">Punch In</th>
                        <th className="text-left px-5 py-3 font-semibold">Punch Out</th>
                        <th className="text-left px-5 py-3 font-semibold">Duration</th>
                        <th className="text-left px-5 py-3 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {attendance.map(att => (
                        <tr key={att.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-5 py-3.5">
                            <div className="font-medium text-slate-800">{att.employees?.name}</div>
                            <div className="text-slate-400 text-xs">{att.employees?.department} · {att.employees?.position}</div>
                          </td>
                          <td className="px-5 py-3.5 text-emerald-600 font-medium">{formatTime(att.punch_in)}</td>
                          <td className="px-5 py-3.5 text-amber-600 font-medium">{formatTime(att.punch_out)}</td>
                          <td className="px-5 py-3.5 text-slate-600">{getDuration(att)}</td>
                          <td className="px-5 py-3.5">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                              att.punch_out ? 'bg-slate-100 text-slate-600' : 'bg-emerald-100 text-emerald-700'
                            }`}>
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

function StatCard({ icon, label, value, bg, iconColor, valueColor }: {
  icon: React.ReactNode; label: string; value: number
  bg: string; iconColor: string; valueColor: string
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${bg} ${iconColor}`}>
        {icon}
      </div>
      <div>
        <div className="text-slate-500 text-xs font-medium">{label}</div>
        <div className={`text-3xl font-bold mt-0.5 ${valueColor}`}>{value}</div>
      </div>
    </div>
  )
}
