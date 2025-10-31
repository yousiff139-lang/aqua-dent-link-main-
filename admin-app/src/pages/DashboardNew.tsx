import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { DashboardLayout } from '@/components/DashboardLayout'
import { Card } from '@/components/ui/card'
import { Users, Calendar, CheckCircle, Clock } from 'lucide-react'
import { format } from 'date-fns'

interface DashboardStats {
  totalPatients: number
  todayAppointments: number
  pendingAppointments: number
  completedAppointments: number
}

interface TodayAppointment {
  id: string
  patient_name: string
  time: string
  type: string
  status: string
}

export default function DashboardNew() {
  const { user } = useAuth()
  const [stats, setStats] = useState<DashboardStats>({
    totalPatients: 0,
    todayAppointments: 0,
    pendingAppointments: 0,
    completedAppointments: 0,
  })
  const [todayAppointments, setTodayAppointments] = useState<TodayAppointment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [user])

  const loadDashboardData = async () => {
    if (!user) return

    try {
      setLoading(true)

      // Get user ID from email
      const { data: userData } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', user.email)
        .single()

      if (!userData) return

      const userId = userData.id
      const today = format(new Date(), 'yyyy-MM-dd')

      // Get total patients (unique patient IDs from appointments)
      const { data: appointments } = await supabase
        .from('appointments')
        .select('patient_id')
        .eq('dentist_id', userId)

      const uniquePatients = new Set(appointments?.map(a => a.patient_id) || [])
      
      // Get today's appointments
      const { data: todayAppts } = await supabase
        .from('appointments')
        .select(`
          id,
          appointment_date,
          appointment_time,
          appointment_type,
          status,
          profiles!appointments_patient_id_fkey(full_name)
        `)
        .eq('dentist_id', userId)
        .gte('appointment_date', today)
        .lte('appointment_date', today)

      // Get pending appointments
      const { count: pendingCount } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('dentist_id', userId)
        .eq('status', 'upcoming')

      // Get completed appointments
      const { count: completedCount } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('dentist_id', userId)
        .eq('status', 'completed')

      setStats({
        totalPatients: uniquePatients.size,
        todayAppointments: todayAppts?.length || 0,
        pendingAppointments: pendingCount || 0,
        completedAppointments: completedCount || 0,
      })

      // Format today's appointments
      const formattedAppts = todayAppts?.map(apt => ({
        id: apt.id,
        patient_name: (apt.profiles as any)?.full_name || 'Unknown',
        time: apt.appointment_time || apt.appointment_date,
        type: apt.appointment_type,
        status: apt.status,
      })) || []

      setTodayAppointments(formattedAppts)
    } catch (error) {
      console.error('Error loading dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  const statCards = [
    {
      title: 'Total Patients',
      value: stats.totalPatients,
      icon: Users,
      color: 'from-blue-500 to-cyan-400',
      bgColor: 'bg-blue-50',
    },
    {
      title: "Today's Appointments",
      value: stats.todayAppointments,
      icon: Calendar,
      color: 'from-purple-500 to-pink-400',
      bgColor: 'bg-purple-50',
    },
    {
      title: 'Pending',
      value: stats.pendingAppointments,
      icon: Clock,
      color: 'from-orange-500 to-yellow-400',
      bgColor: 'bg-orange-50',
    },
    {
      title: 'Completed',
      value: stats.completedAppointments,
      icon: CheckCircle,
      color: 'from-green-500 to-emerald-400',
      bgColor: 'bg-green-50',
    },
  ]

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">Welcome back, {user?.email}</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map((stat) => {
            const Icon = stat.icon
            return (
              <Card key={stat.title} className="p-6 border-0 shadow-lg hover:shadow-xl transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">{stat.title}</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
                  </div>
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-lg`}>
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                </div>
              </Card>
            )
          })}
        </div>

        {/* Today's Appointments */}
        <Card className="p-6 border-0 shadow-lg">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Today's Appointments</h2>
          {todayAppointments.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No appointments scheduled for today</p>
            </div>
          ) : (
            <div className="space-y-3">
              {todayAppointments.map((apt) => (
                <div
                  key={apt.id}
                  className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-white font-semibold">
                      {apt.patient_name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{apt.patient_name}</p>
                      <p className="text-sm text-gray-500">{apt.type}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">{apt.time}</p>
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                      apt.status === 'completed' ? 'bg-green-100 text-green-700' :
                      apt.status === 'upcoming' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {apt.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  )
}
