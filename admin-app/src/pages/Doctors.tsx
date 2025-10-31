import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DashboardLayout } from '@/components/DashboardLayout'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Users, Search, Edit, Trash2, Star } from 'lucide-react'

interface Doctor {
  id: number
  full_name: string
  email: string
  specialization: string
  years_of_experience: number
  rating: number
  bio: string
  profileImage: string
}

export default function Doctors() {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')

  // Hardcoded doctors from user website - using same images
  const doctors: Doctor[] = [
    {
      id: 1,
      full_name: "Dr. Sarah Johnson",
      email: "sarah.johnson@dentalcare.com",
      specialization: "General Dentistry",
      bio: "Passionate about patient care with 3 years of training. Specializes in preventive care and cosmetic procedures.",
      years_of_experience: 3,
      rating: 4.9,
      profileImage: "/avatars/dentist-1.jpg"
    },
    {
      id: 2,
      full_name: "Dr. Michael Chen",
      email: "michael.chen@dentalcare.com",
      specialization: "Orthodontics",
      bio: "Dedicated to creating beautiful smiles. Expert in braces and alignment treatments with a gentle approach.",
      years_of_experience: 5,
      rating: 4.8,
      profileImage: "/avatars/dentist-2.jpg"
    },
    {
      id: 3,
      full_name: "Dr. Emily Rodriguez",
      email: "emily.rodriguez@dentalcare.com",
      specialization: "Cosmetic Dentistry",
      bio: "Focused on aesthetic dentistry and smile makeovers. Trained in the latest whitening and veneer techniques.",
      years_of_experience: 4,
      rating: 5.0,
      profileImage: "/avatars/dentist-3.jpg"
    },
    {
      id: 4,
      full_name: "Dr. James Wilson",
      email: "james.wilson@dentalcare.com",
      specialization: "Endodontics",
      bio: "Root canal specialist with a pain-free approach. Committed to saving natural teeth and patient comfort.",
      years_of_experience: 6,
      rating: 4.7,
      profileImage: "/avatars/dentist-2.jpg"
    },
    {
      id: 5,
      full_name: "Dr. Lisa Thompson",
      email: "lisa.thompson@dentalcare.com",
      specialization: "Pediatric Dentistry",
      bio: "Making dental visits fun for kids! Experienced in working with children and anxious patients.",
      years_of_experience: 7,
      rating: 4.9,
      profileImage: "/avatars/dentist-1.jpg"
    },
    {
      id: 6,
      full_name: "Dr. David Kim",
      email: "david.kim@dentalcare.com",
      specialization: "Oral Surgery",
      bio: "Expert in extractions and surgical procedures. Known for precision and minimal recovery time.",
      years_of_experience: 8,
      rating: 4.8,
      profileImage: "/avatars/dentist-2.jpg"
    }
  ]

  const filteredDoctors = doctors.filter(
    (d) =>
      d.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.specialization.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">All Doctors</h1>
            <p className="text-gray-500 mt-1">{doctors.length} registered doctors</p>
          </div>
        </div>

        <Card className="p-4 border-0 shadow-lg">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              placeholder="Search doctors..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 border-0 bg-gray-50"
            />
          </div>
        </Card>

        {filteredDoctors.length === 0 ? (
          <Card className="p-12 border-0 shadow-lg text-center">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No doctors found</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDoctors.map((doctor) => (
              <Card key={doctor.id} className="p-6 border-0 shadow-lg hover:shadow-xl transition-all relative group">
                <button
                  onClick={() => navigate(`/edit-profile/${doctor.id}`)}
                  className="absolute top-4 right-4 w-8 h-8 rounded-full bg-blue-100 hover:bg-blue-200 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Edit Profile"
                >
                  <Edit className="w-4 h-4 text-blue-600" />
                </button>
                
                <div className="flex items-start gap-4">
                  <img
                    src={doctor.profileImage}
                    alt={doctor.full_name}
                    className="w-24 h-24 rounded-full object-cover shadow-md cursor-pointer hover:scale-105 transition-transform flex-shrink-0"
                    onClick={() => navigate(`/edit-profile/${doctor.id}`)}
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate text-lg">{doctor.full_name}</h3>
                    <p className="text-sm text-gray-500 truncate">{doctor.email}</p>
                    <p className="text-sm text-blue-600 mt-1 font-medium">{doctor.specialization}</p>
                    
                    <div className="mt-3 flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-yellow-500 fill-current" />
                        <span className="text-gray-600 font-semibold">{doctor.rating.toFixed(1)}</span>
                      </div>
                      {doctor.years_of_experience && (
                        <span className="text-gray-600">{doctor.years_of_experience} years exp.</span>
                      )}
                    </div>

                    <div className="mt-4 flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="flex-1"
                        onClick={() => navigate(`/edit-profile/${doctor.id}`)}
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Edit Profile
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 hover:text-red-700"
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
