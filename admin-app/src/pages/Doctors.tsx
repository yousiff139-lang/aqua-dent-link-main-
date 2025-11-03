import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { DashboardLayout } from '@/components/DashboardLayout'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Users, Search, Edit, Trash2, Star, Plus } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useRealtimeSync } from '@/hooks/useRealtimeSync'
import { toast } from 'sonner'

interface Doctor {
  id: string
  name: string
  email: string
  specialization?: string
  specialty?: string
  years_of_experience?: number
  rating?: number
  bio?: string
  profile_picture?: string
  image_url?: string
  status?: string
  created_at?: string
}

export default function Doctors() {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Fetch dentists from database
  const fetchDoctors = async () => {
    try {
      setIsLoading(true)
      const { data, error } = await supabase
        .from('dentists')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      setDoctors(data || [])
    } catch (error: any) {
      console.error('Error fetching doctors:', error)
      toast.error('Failed to load doctors')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchDoctors()
  }, [])

  // Real-time sync for dentists table
  useRealtimeSync({
    table: 'dentists',
    onInsert: (newDoctor: any) => {
      console.log('New dentist added:', newDoctor)
      setDoctors((prev) => [newDoctor, ...prev])
      toast.success(`New dentist ${newDoctor.name} added`)
    },
    onUpdate: (updatedDoctor: any) => {
      console.log('Dentist updated:', updatedDoctor)
      setDoctors((prev) =>
        prev.map((d) => (d.id === updatedDoctor.id ? updatedDoctor : d))
      )
      toast.success(`Dentist ${updatedDoctor.name} updated`)
    },
    onDelete: (deletedId: string) => {
      console.log('Dentist deleted:', deletedId)
      setDoctors((prev) => prev.filter((d) => d.id !== deletedId))
      toast.success('Dentist deleted')
    },
  })

  const handleDeleteClick = (doctor: Doctor) => {
    if (window.confirm(`Are you sure you want to delete ${doctor.name}? This will remove them from the system and they will no longer appear in the user portal or chatbot suggestions. This action cannot be undone.`)) {
      handleDelete(doctor)
    }
  }

  const handleDelete = async (doctor: Doctor) => {
    try {
      const { error } = await supabase
        .from('dentists')
        .delete()
        .eq('id', doctor.id)

      if (error) throw error

      toast.success(`Dr. ${doctor.name} has been deleted`)
    } catch (error: any) {
      console.error('Error deleting doctor:', error)
      toast.error('Failed to delete doctor')
    }
  }

  const filteredDoctors = doctors.filter(
    (d) =>
      d.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.specialization?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.specialty?.toLowerCase().includes(searchQuery.toLowerCase())
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
                      {doctor.rating && (
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 text-yellow-500 fill-current" />
                          <span className="text-gray-600 font-semibold">{doctor.rating.toFixed(1)}</span>
                        </div>
                      )}
                      {doctor.years_of_experience && (
                        <span className="text-gray-600">{doctor.years_of_experience} years exp.</span>
                      )}
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
