import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { DashboardLayout } from '@/components/DashboardLayout'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Users, Search, Calendar, FileText } from 'lucide-react'

interface Patient {
  id: string
  name: string
  email: string
  totalAppointments: number
  lastVisit: string
}

export default function Patients() {
  const { user } = useAuth()
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    loadPatients()
  }, [user])

  const loadPatients = async () => {
    if (!user) return

    try {
      setLoading(true)

      // Get user ID
      const { data: userData } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', user.email)
        .single()

      if (!userData) return

      // Get all appointments for this dentist
      const { data: appointments } = await supabase
        .from('appointments')
        .select(`
          patient_id,
          appointment_date,
          profiles!appointments_patient_id_fkey(full_name, email)
        `)
        .eq('dentist_id', userData.id)
        .order('appointment_date', { ascending: false })

      // Group by patient
      const patientMap = new Map<string, Patient>()

      appointments?.forEach((apt) => {
        const profile = apt.profiles as any
        if (!profile) return

        const patientId = apt.patient_id
        if (patientMap.has(patientId)) {
          const existing = patientMap.get(patientId)!
          existing.totalAppointments++
          // Update last visit if this is more recent
          if (apt.appointment_date > existing.lastVisit) {
            existing.lastVisit = apt.appointment_date
          }
        } else {
          patientMap.set(patientId, {
            id: patientId,
            name: profile.full_name || 'Unknown',
            email: profile.email || '',
            totalAppointments: 1,
            lastVisit: apt.appointment_date,
          })
        }
      })

      setPatients(Array.from(patientMap.values()))
    } catch (error) {
      console.error('Error loading patients:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredPatients = patients.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Patients</h1>
            <p className="text-gray-500 mt-1">{patients.length} total patients</p>
          </div>
        </div>

        {/* Search */}
        <Card className="p-4 border-0 shadow-lg">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              placeholder="Search patients by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 border-0 bg-gray-50"
            />
          </div>
        </Card>

        {/* Patients List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        ) : filteredPatients.length === 0 ? (
          <Card className="p-12 border-0 shadow-lg text-center">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">
              {searchQuery ? 'No patients found matching your search' : 'No patients yet'}
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPatients.map((patient) => (
              <Card
                key={patient.id}
                className="p-6 border-0 shadow-lg hover:shadow-xl transition-all cursor-pointer group"
              >
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-white font-bold text-xl flex-shrink-0">
                    {patient.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                      {patient.name}
                    </h3>
                    <p className="text-sm text-gray-500 truncate">{patient.email}</p>
                    
                    <div className="mt-4 space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-600">
                          Last visit: {new Date(patient.lastVisit).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <FileText className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-600">
                          {patient.totalAppointments} appointment{patient.totalAppointments !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
