import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Card } from '@/components/ui/card'
import { Calendar, Clock, User } from 'lucide-react'

interface Patient {
  id: string
  patientName: string
  appointmentTime: string
  serviceType: string
  status: string
  notes?: string
}

interface TodaysPatientsProps {
  dentistId: string
}

export function TodaysPatients({ dentistId }: TodaysPatientsProps) {
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadTodaysPatients()
  }, [dentistId])

  const loadTodaysPatients = async () => {
    try {
      setLoading(true)
      const today = new Date().toISOString().split('T')[0]

      const { data, error } = await supabase
        .from('appointments')
        .select(`
          id,
          appointment_date,
          appointment_type,
          status,
          notes,
          profiles!appointments_patient_id_fkey (
            full_name
          )
        `)
        .eq('dentist_id', dentistId)
        .gte('appointment_date', `${today}T00:00:00`)
        .lte('appointment_date', `${today}T23:59:59`)
        .order('appointment_date', { ascending: true })

      if (error) throw error

      const formattedPatients: Patient[] = data?.map((apt: any) => ({
        id: apt.id,
        patientName: apt.profiles?.full_name || 'Unknown Patient',
        appointmentTime: new Date(apt.appointment_date).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        }),
        serviceType: apt.appointment_type,
        status: apt.status,
        notes: apt.notes
      })) || []

      setPatients(formattedPatients)
    } catch (error) {
      console.error('Error loading today\'s patients:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-700'
      case 'upcoming':
        return 'bg-blue-100 text-blue-700'
      case 'cancelled':
        return 'bg-red-100 text-red-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  if (loading) {
    return (
      <Card className="p-6 border-0 shadow-lg">
        <h3 className="text-xl font-bold text-gray-900 mb-4">Today's Patients</h3>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-6 border-0 shadow-lg bg-gradient-to-r from-blue-50 to-cyan-50">
      <div className="flex items-center gap-2 mb-4">
        <Calendar className="w-6 h-6 text-blue-600" />
        <h3 className="text-xl font-bold text-gray-900">Today's Patients</h3>
        <span className="ml-auto bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
          {patients.length}
        </span>
      </div>

      {patients.length === 0 ? (
        <div className="text-center py-8">
          <User className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No appointments scheduled for today</p>
        </div>
      ) : (
        <div className="space-y-3">
          {patients.map((patient) => (
            <Card key={patient.id} className="p-4 bg-white border-0 shadow hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-white font-bold flex-shrink-0">
                    {patient.patientName.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-gray-900">{patient.patientName}</h4>
                    <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {patient.appointmentTime}
                      </span>
                      <span className="text-blue-600">{patient.serviceType}</span>
                    </div>
                    {patient.notes && (
                      <p className="text-xs text-gray-500 mt-2">{patient.notes}</p>
                    )}
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(patient.status)}`}>
                  {patient.status}
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </Card>
  )
}
