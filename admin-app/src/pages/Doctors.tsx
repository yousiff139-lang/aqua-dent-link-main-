import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { DashboardLayout } from '@/components/DashboardLayout'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Users, Search, Edit, Trash2, Plus, CalendarCheck, ClipboardList } from 'lucide-react'
import { toast } from '@/components/Toaster'
import api from '@/lib/api'
import { supabase } from '@/lib/supabase'
import { AdminDentist, AdminDentistsResponse, DeleteDentistResponse } from '@/types/admin'

export default function Doctors() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchQuery, setSearchQuery] = useState('')
  const [doctors, setDoctors] = useState<AdminDentist[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchDoctors = async () => {
    try {
      setIsLoading(true)
      let loaded = false

      // 1) Try backend API first
      try {
      const response = await api.get<AdminDentistsResponse>('/admin/dentists')
      const responseData = response as any
        const backendDoctors = responseData?.data

        if (Array.isArray(backendDoctors) && backendDoctors.length > 0) {
          setDoctors(backendDoctors)
          loaded = true
        }
      } catch (apiError) {
        console.warn('Backend /admin/dentists failed, falling back to Supabase:', apiError)
      }

      // 2) Fallback: load directly from Supabase if backend failed or returned no dentists
      if (!loaded) {
        const { data, error } = await supabase
          .from('dentists')
          .select('*')
          .order('created_at', { ascending: false })

        if (error) {
          console.error('Error loading dentists from Supabase:', error)
          throw new Error(error.message || 'Failed to load dentists from database')
        }

        const dentists = (data || []).map((d: any): AdminDentist => ({
          id: d.id,
          name: d.name || 'Unknown Dentist',
          email: d.email,
          specialization: d.specialization || d.specialty || 'General Dentistry',
          phone: d.phone || '',
          status: d.status || 'active',
          years_of_experience: d.years_of_experience ?? d.experience_years ?? 0,
          education: d.education || '',
          bio: d.bio || '',
          image_url: d.image_url || d.profile_picture || null,
          profile_picture: d.profile_picture || d.image_url || null,
          totalAppointments: 0,
          upcomingAppointments: 0,
        }))

        setDoctors(dentists)
      }
    } catch (error: any) {
      console.error('Error fetching doctors:', error)
      toast({
        title: 'Failed to load doctors',
        description: error.message || 'Please try again later.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchDoctors()
  }, [])

  // Refresh doctors list when navigated from AddDoctor page
  useEffect(() => {
    if (location.state?.refresh) {
      fetchDoctors()
      // Clear the state to prevent unnecessary refreshes
      navigate(location.pathname, { replace: true, state: {} })
      
      // Show success message if new dentist was created
      if (location.state?.newDentist) {
        toast({
          title: 'Dentist added successfully',
          description: `${location.state.newDentist.name} has been added to the system.`,
        })
      }
    }
  }, [location.state])

  const handleDeleteClick = (doctor: AdminDentist) => {
    if (window.confirm(`Are you sure you want to delete ${doctor.name}? This will remove them from the system and they will no longer appear in the user portal or chatbot suggestions. This action cannot be undone.`)) {
      handleDelete(doctor)
    }
  }

  const handleDelete = async (doctor: AdminDentist) => {
    try {
      await api.delete<DeleteDentistResponse>(`/admin/dentists/${doctor.id}`)
      setDoctors((prev) => prev.filter((d) => d.id !== doctor.id))
      toast({
        title: 'Dentist deleted',
        description: `${doctor.name} has been removed.`,
      })
    } catch (error: any) {
      console.error('Error deleting doctor:', error)
      toast({
        title: 'Failed to delete doctor',
        description: error.message || 'Please try again later.',
        variant: 'destructive',
      })
    }
  }

  const filteredDoctors = doctors.filter(
    (d) =>
      d.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.specialization?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const activeDoctors = filteredDoctors.filter((d) => d.status !== 'inactive')

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">All Doctors</h1>
            <p className="text-gray-500 mt-1">
              {activeDoctors.length} active doctor{activeDoctors.length !== 1 ? 's' : ''} • {doctors.length} total
            </p>
          </div>
          <Button onClick={() => navigate('/add-doctor')}>
            <Plus className="w-4 h-4 mr-2" />
            Add Doctor
          </Button>
        </div>

        <Card className="p-4 border-0 shadow-lg">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              placeholder="Search doctors by name, email, or specialization..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 border-0 bg-gray-50"
            />
          </div>
        </Card>

        {isLoading ? (
          <Card className="p-12 border-0 shadow-lg text-center">
            <p className="text-gray-500">Loading doctors...</p>
          </Card>
        ) : filteredDoctors.length === 0 ? (
          <Card className="p-12 border-0 shadow-lg text-center">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No doctors found</p>
            <Button 
              onClick={() => navigate('/add-doctor')} 
              className="mt-4"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add First Doctor
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDoctors.map((doctor) => (
              <Card 
                key={doctor.id} 
                className="p-6 border-0 shadow-lg hover:shadow-xl transition-all relative group"
              >
                {doctor.status === 'inactive' && (
                  <div className="absolute top-2 right-2 bg-red-100 text-red-700 text-xs px-2 py-1 rounded">
                    Inactive
                  </div>
                )}
                
                <button
                  onClick={() => navigate(`/edit-profile/${doctor.id}`)}
                  className="absolute top-4 right-4 w-8 h-8 rounded-full bg-blue-100 hover:bg-blue-200 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Edit Profile"
                >
                  <Edit className="w-4 h-4 text-blue-600" />
                </button>
                
                <div className="flex items-start gap-4">
                  <img
                    src={doctor.profile_picture || doctor.image_url || '/avatars/default.png.svg'}
                    alt={doctor.name}
                    className="w-24 h-24 rounded-full object-cover shadow-md cursor-pointer hover:scale-105 transition-transform flex-shrink-0"
                    onClick={() => navigate(`/edit-profile/${doctor.id}`)}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/avatars/default.png.svg'
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate text-lg">{doctor.name}</h3>
                    <p className="text-sm text-gray-500 truncate">{doctor.email}</p>
                    <p className="text-sm text-blue-600 mt-1 font-medium">
                      {doctor.specialization || doctor.specialty || 'General Dentistry'}
                    </p>
                    
                    <div className="mt-3 flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1 text-gray-600">
                        <CalendarCheck className="w-4 h-4 text-emerald-500" />
                        <span>{doctor.upcomingAppointments} upcoming</span>
                      </div>
                      <div className="flex items-center gap-1 text-gray-600">
                        <ClipboardList className="w-4 h-4 text-blue-500" />
                        <span>{doctor.totalAppointments} total</span>
                      </div>
                    </div>

                    {doctor.bio && (
                      <p className="text-xs text-gray-500 mt-2 line-clamp-2">{doctor.bio}</p>
                    )}

                    <div className="mt-4 flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="flex-1"
                        onClick={() => navigate(`/edit-profile/${doctor.id}`)}
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleDeleteClick(doctor)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
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
