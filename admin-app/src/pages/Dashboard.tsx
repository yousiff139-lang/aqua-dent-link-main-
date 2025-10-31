import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { DashboardLayout } from '@/components/DashboardLayout'
import { Card } from '@/components/ui/card'
import { Users, Calendar, CheckCircle, Clock } from 'lucide-react'
import { TodaysPatients } from '@/components/TodaysPatients'

interface DashboardStats {
  totalPatients: number
  todayAppointments: number
  pendingAppointments: number
  completedAppointments: number
}

export default function Dashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState<DashboardStats>({
    totalPatients: 0,
    todayAppointments: 0,
    pendingAppointments: 0,
    completedAppointments: 0,
  })
  const [dentistName, setDentistName] = useState<string>('')
  const [dentistId, setDentistId] = useState<string>('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [user])

  const loadDashboardData = async () => {
    if (!user) return

    try {
      setLoading(true)

      // Get user ID and name from email
      const { data: userData } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('email', user.email)
        .single()

      if (!userData) {
        setLoading(false)
        return
      }

      const userId = userData.id
      setDentistId(userId)
      setDentistName(userData.full_name || user.email || 'Doctor')

      // Get total patients (unique patient IDs from appointments)
      const { data: appointments } = await supabase
        .from('appointments')
        .select('patient_id')
        .eq('dentist_id', userId)

      const uniquePatients = new Set(appointments?.map(a => a.patient_id) || [])
      
      // Get today's appointments count
      const today = new Date().toISOString().split('T')[0]
      const { count: todayCount } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
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
        todayAppointments: todayCount || 0,
        pendingAppointments: pendingCount || 0,
        completedAppointments: completedCount || 0,
      })
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
    },
    {
      title: "Today's Appointments",
      value: stats.todayAppointments,
      icon: Calendar,
      color: 'from-purple-500 to-pink-400',
    },
    {
      title: 'Pending',
      value: stats.pendingAppointments,
      icon: Clock,
      color: 'from-orange-500 to-yellow-400',
    },
    {
      title: 'Completed',
      value: stats.completedAppointments,
      icon: CheckCircle,
      color: 'from-green-500 to-emerald-400',
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
          <p className="text-gray-500 mt-1">Welcome back, {dentistName}</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map((stat) => {
            const Icon = stat.icon
            return (
              <Card key={stat.title} className="p-6 border-0 shadow-lg hover:shadow-xl transition-shadow bg-white">
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

        {/* Today's Patients */}
        {dentistId && <TodaysPatients dentistId={dentistId} />}

        {/* Welcome Card */}
        <Card className="p-8 border-0 shadow-lg bg-gradient-to-r from-blue-50 to-cyan-50">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome to Your Dashboard!</h2>
          <p className="text-gray-600">
            Manage your patients, appointments, and profile from here. Use the sidebar to navigate between different sections.
          </p>
        </Card>
      </div>
    </DashboardLayout>
  )
}
