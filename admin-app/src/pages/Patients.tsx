import { useEffect, useMemo, useState } from 'react'
import { DashboardLayout } from '@/components/DashboardLayout'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Users, Search, Calendar, FileText } from 'lucide-react'
import api from '@/lib/api'
import { AdminPatient, AdminPatientsResponse } from '@/types/admin'
import { toast } from '@/components/Toaster'

export default function Patients() {
  const [patients, setPatients] = useState<AdminPatient[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)

  const limit = 24

  useEffect(() => {
    const timeout = setTimeout(() => {
      setPage(1)
      loadPatients(1, limit, searchQuery)
    }, 400)
    return () => clearTimeout(timeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery])

  useEffect(() => {
    loadPatients(page, limit, searchQuery)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page])

  const loadPatients = async (targetPage: number, targetLimit: number, search: string) => {
    try {
      setLoading(true)
      const response = await api.get<AdminPatientsResponse>('/admin/patients', {
        params: {
          page: targetPage,
          limit: targetLimit,
          search,
        },
      })

      // Response structure: { success: true, data: [...], pagination: {...} }
      const responseData = response as any
      setPatients(responseData.data || [])
      setTotal(responseData.pagination?.total || 0)
    } catch (error: any) {
      console.error('Error loading patients:', error)
      toast({
        title: 'Failed to load patients',
        description: error.message || 'Please try again later.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / limit)), [total])

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Patients & Users</h1>
            <p className="text-gray-500 mt-1">{total} total users</p>
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
        ) : patients.length === 0 ? (
          <Card className="p-12 border-0 shadow-lg text-center">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">
              {searchQuery ? 'No users found matching your search' : 'No records yet'}
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {patients.map((patient) => (
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
                          Last visit:{' '}
                          {patient.lastAppointment
                            ? new Date(patient.lastAppointment).toLocaleDateString()
                            : '—'}
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

        {patients.length > 0 && (
          <div className="flex items-center justify-between border-t border-gray-100 pt-4">
            <div className="space-x-2">
              <button
                className="px-4 py-2 rounded-md border border-gray-200 text-sm disabled:opacity-50"
                onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                disabled={page === 1}
              >
                Previous
              </button>
              <button
                className="px-4 py-2 rounded-md border border-gray-200 text-sm disabled:opacity-50"
                onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={page === totalPages}
              >
                Next
              </button>
            </div>
            <p className="text-sm text-gray-500">
              Page {page} of {totalPages}
            </p>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
