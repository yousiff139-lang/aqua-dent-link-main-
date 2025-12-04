import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/DashboardLayout'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Calendar, Clock, User, Download, Mail, Phone, Filter } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { supabase } from '@/lib/supabase'
import { useRealtimeAppointments } from '@/hooks/useRealtimeSync'
import { useAuth } from '@/contexts/AuthContext'
import api from '@/lib/api'
import { toast } from '@/components/Toaster'

interface Appointment {
  id: string
  patient_name: string
  patient_email: string
  patient_phone: string
  appointment_date: string
  appointment_time: string
  symptoms?: string
  chief_complaint?: string
  reason?: string
  status: string
  payment_method: string
  payment_status: string
  pdf_report_url?: string
  dentist_name?: string
  dentist_email?: string
  dentist_id?: string
}

export default function Appointments() {
  const { user } = useAuth()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('all')

  useEffect(() => {
    loadAppointments()
  }, [statusFilter])

  // Set up real-time subscription for instant updates
  useRealtimeAppointments(
    user?.id,
    'admin',
    {
      onCreated: (newAppointment) => {
        // Reload appointments to get full data with relations
        loadAppointments()
        console.log('🆕 New appointment received in real-time:', newAppointment.id)
      },
      onUpdated: (updatedAppointment) => {
        setAppointments((prev) =>
          prev.map((apt) =>
            apt.id === updatedAppointment.id
              ? { ...updatedAppointment, dentists: apt.dentists } as Appointment
              : apt
          )
        )
        console.log('🔄 Appointment updated in real-time:', updatedAppointment.id)
      },
      onDeleted: (deletedId) => {
        setAppointments((prev) => prev.filter((apt) => apt.id !== deletedId))
        console.log('🗑️ Appointment deleted in real-time:', deletedId)
      },
    }
  )

  const loadAppointments = async () => {
    try {
      setLoading(true)
      
      let loaded: Appointment[] | null = null

      // 1) Try backend API first
      try {
      const response = await api.get<{ success: boolean; data: Appointment[] }>('/admin/appointments')
        const responseData = response as any
        const apiAppointments = responseData?.data

        if (Array.isArray(apiAppointments)) {
          loaded = apiAppointments
        }
      } catch (apiError) {
        console.warn('Backend /admin/appointments failed, falling back to Supabase:', apiError)
      }

      // 2) Fallback: direct Supabase query if backend failed
      if (!loaded) {
        const { data, error } = await supabase
          .from('appointments')
          .select('*')
          .order('appointment_date', { ascending: false })
          .order('created_at', { ascending: false })

        if (error) {
          console.error('Error loading appointments from Supabase:', error)
          throw new Error(error.message || 'Failed to load appointments from database')
        }

        loaded = (data || []) as Appointment[]
      }

      let normalized = loaded

      // Apply status filter on client side if needed
      if (statusFilter !== 'all') {
        normalized = normalized.filter(apt => apt.status === statusFilter)
      }

      // Sort by appointment date descending
      normalized.sort((a, b) => {
        const dateA = new Date(a.appointment_date).getTime()
        const dateB = new Date(b.appointment_date).getTime()
        return dateB - dateA
      })

      setAppointments(normalized)
    } catch (error: any) {
      console.error('Error loading appointments:', error)
      toast({
        title: 'Failed to load appointments',
        description: error.message || 'Please try again later.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
      pending: { variant: 'secondary', label: 'Pending' },
      confirmed: { variant: 'default', label: 'Confirmed' },
      upcoming: { variant: 'default', label: 'Upcoming' },
      completed: { variant: 'outline', label: 'Completed' },
      cancelled: { variant: 'destructive', label: 'Cancelled' },
    }
    return variants[status] || { variant: 'outline', label: status }
  }

  const getPaymentStatusBadge = (paymentStatus: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
      pending: { variant: 'secondary', label: 'Pending' },
      paid: { variant: 'default', label: 'Paid' },
      failed: { variant: 'destructive', label: 'Failed' },
    }
    return variants[paymentStatus] || { variant: 'outline', label: paymentStatus }
  }

  const formatDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), 'MMM dd, yyyy')
    } catch {
      return dateStr
    }
  }

  const formatTime = (timeStr: string) => {
    try {
      const [hours, minutes] = timeStr.split(':')
      const date = new Date()
      date.setHours(parseInt(hours), parseInt(minutes))
      return date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit', 
        hour12: true 
      })
    } catch {
      return timeStr
    }
  }

  const filteredAppointments = appointments.filter(apt => 
    statusFilter === 'all' || apt.status === statusFilter
  )

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <h1 className="text-3xl font-bold text-gray-900">Appointments</h1>
          <Card className="p-12 border-0 shadow-lg text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-500 mt-4">Loading appointments...</p>
          </Card>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Appointments</h1>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Appointments</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="upcoming">Upcoming</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {filteredAppointments.length === 0 ? (
          <Card className="p-12 border-0 shadow-lg text-center">
            <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No appointments found</p>
          </Card>
        ) : (
          <div className="grid gap-6">
            {filteredAppointments.map((appointment) => {
              const statusBadge = getStatusBadge(appointment.status)
              const paymentBadge = getPaymentStatusBadge(appointment.payment_status)

              return (
                <Card key={appointment.id} className="p-6 border-0 shadow-lg hover:shadow-xl transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-white font-semibold">
                        {appointment.patient_name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg text-gray-900">{appointment.patient_name}</h3>
                        <p className="text-sm text-gray-500">
                          {appointment.dentist_name || 'Unknown Dentist'}
                          {appointment.dentist_email && ` • ${appointment.dentist_email}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
                      <Badge variant={paymentBadge.variant}>{paymentBadge.label}</Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="h-4 w-4" />
                      <span>{formatDate(appointment.appointment_date)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Clock className="h-4 w-4" />
                      <span>{formatTime(appointment.appointment_time)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <User className="h-4 w-4" />
                      <span>{appointment.payment_method}</span>
                    </div>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-gray-400" />
                      <a href={`mailto:${appointment.patient_email}`} className="text-blue-600 hover:underline">
                        {appointment.patient_email}
                      </a>
                    </div>
                    {appointment.patient_phone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-4 w-4 text-gray-400" />
                        <a href={`tel:${appointment.patient_phone}`} className="text-blue-600 hover:underline">
                          {appointment.patient_phone}
                        </a>
                      </div>
                    )}
                  </div>

                  {(appointment.reason || appointment.symptoms || appointment.chief_complaint) && (
                    <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-700">
                        <span className="font-medium">Reason: </span>
                        {appointment.reason || appointment.chief_complaint || appointment.symptoms}
                      </p>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-4 border-t">
                    <div className="text-sm text-gray-500">
                      Appointment ID: {appointment.id}
                    </div>
                    {appointment.pdf_report_url && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(appointment.pdf_report_url, '_blank')}
                        className="flex items-center gap-2"
                      >
                        <Download className="h-4 w-4" />
                        Download PDF
                      </Button>
                    )}
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
