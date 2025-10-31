import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { DashboardLayout } from '@/components/DashboardLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from '@/components/Toaster'
import { Save, Upload, X } from 'lucide-react'

interface DoctorProfile {
  id: number
  full_name: string
  email: string
  specialization: string
  years_of_experience: number
  rating: number
  bio: string
  profileImage: string
  education?: string
  clinic_address?: string
  contact_info?: string
  available_times?: {
    monday?: string
    tuesday?: string
    wednesday?: string
    thursday?: string
    friday?: string
    saturday?: string
    sunday?: string
  }
}

export default function EditProfile() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)
  const [imagePreview, setImagePreview] = useState<string>('')
  
  const [formData, setFormData] = useState<DoctorProfile>({
    id: 0,
    full_name: '',
    email: '',
    specialization: '',
    years_of_experience: 0,
    rating: 5.0,
    bio: '',
    profileImage: '/avatars/default.png',
    education: '',
    clinic_address: '',
    contact_info: '',
    available_times: {
      monday: '',
      tuesday: '',
      wednesday: '',
      thursday: '',
      friday: '',
      saturday: '',
      sunday: '',
    },
  })

  useEffect(() => {
    loadDoctorProfile()
  }, [id])

  const loadDoctorProfile = () => {
    // Hardcoded doctors data (same as Doctors page)
    const doctors = [
      {
        id: 1,
        full_name: "Dr. Sarah Johnson",
        email: "sarah.johnson@dentalcare.com",
        specialization: "General Dentistry",
        bio: "Passionate about patient care with 3 years of training. Specializes in preventive care and cosmetic procedures.",
        years_of_experience: 3,
        rating: 4.9,
        profileImage: "/avatars/dentist-1.jpg",
        education: "DDS, Harvard School of Dental Medicine",
        clinic_address: "123 Dental St, Boston, MA",
        contact_info: "+1 (555) 123-4567"
      },
      {
        id: 2,
        full_name: "Dr. Michael Chen",
        email: "michael.chen@dentalcare.com",
        specialization: "Orthodontics",
        bio: "Dedicated to creating beautiful smiles. Expert in braces and alignment treatments with a gentle approach.",
        years_of_experience: 5,
        rating: 4.8,
        profileImage: "/avatars/dentist-2.jpg",
        education: "DDS, University of Toronto",
        clinic_address: "Downtown Dental Care, Toronto, Canada",
        contact_info: "+1 (416) 555-0123"
      },
      {
        id: 3,
        full_name: "Dr. Emily Rodriguez",
        email: "emily.rodriguez@dentalcare.com",
        specialization: "Cosmetic Dentistry",
        bio: "Focused on aesthetic dentistry and smile makeovers. Trained in the latest whitening and veneer techniques.",
        years_of_experience: 4,
        rating: 5.0,
        profileImage: "/avatars/dentist-3.jpg",
        education: "DMD, UCLA School of Dentistry",
        clinic_address: "456 Smile Ave, Los Angeles, CA",
        contact_info: "+1 (310) 555-7890"
      },
      {
        id: 4,
        full_name: "Dr. James Wilson",
        email: "james.wilson@dentalcare.com",
        specialization: "Endodontics",
        bio: "Root canal specialist with a pain-free approach. Committed to saving natural teeth and patient comfort.",
        years_of_experience: 6,
        rating: 4.7,
        profileImage: "/avatars/dentist-2.jpg",
        education: "DDS, University of Washington",
        clinic_address: "789 Care Blvd, Seattle, WA",
        contact_info: "+1 (206) 555-3456"
      },
      {
        id: 5,
        full_name: "Dr. Lisa Thompson",
        email: "lisa.thompson@dentalcare.com",
        specialization: "Pediatric Dentistry",
        bio: "Making dental visits fun for kids! Experienced in working with children and anxious patients.",
        years_of_experience: 7,
        rating: 4.9,
        profileImage: "/avatars/dentist-1.jpg",
        education: "DDS, Boston Children's Hospital",
        clinic_address: "321 Kids Way, Boston, MA",
        contact_info: "+1 (617) 555-6789"
      },
      {
        id: 6,
        full_name: "Dr. David Kim",
        email: "david.kim@dentalcare.com",
        specialization: "Oral Surgery",
        bio: "Expert in extractions and surgical procedures. Known for precision and minimal recovery time.",
        years_of_experience: 8,
        rating: 4.8,
        profileImage: "/avatars/dentist-2.jpg",
        education: "DMD, Harvard Medical School",
        clinic_address: "654 Surgery St, New York, NY",
        contact_info: "+1 (212) 555-9012"
      }
    ]

    const doctor = doctors.find(d => d.id === parseInt(id || '0'))
    if (doctor) {
      setFormData({
        ...doctor,
        available_times: {
          monday: '09:00-17:00',
          tuesday: '09:00-17:00',
          wednesday: '09:00-17:00',
          thursday: '09:00-17:00',
          friday: '09:00-17:00',
          saturday: '10:00-14:00',
          sunday: '',
        }
      })
      setImagePreview(doctor.profileImage)
    }
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload a JPEG or PNG image',
        variant: 'destructive',
      })
      return
    }

    // Validate file size (2MB max)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Image must be less than 2MB',
        variant: 'destructive',
      })
      return
    }

    // Create preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setImagePreview(reader.result as string)
      setFormData({ ...formData, profileImage: reader.result as string })
    }
    reader.readAsDataURL(file)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))

      toast({
        title: 'Success!',
        description: 'Profile updated successfully!',
      })

      navigate('/doctors')
    } catch (error: any) {
      console.error('Error saving profile:', error)
      toast({
        title: 'Error',
        description: error.message || 'Failed to save profile',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Edit Your Profile – {formData.full_name}</h1>
          <p className="text-gray-500 mt-1">Update your information and it will sync across both dashboards</p>
        </div>

        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl">Profile Information</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Profile Image Upload */}
              <div className="space-y-4">
                <Label>Profile Image</Label>
                <div className="flex items-center gap-6">
                  <img
                    src={imagePreview || formData.profileImage}
                    alt="Profile preview"
                    className="w-24 h-24 rounded-full object-cover shadow-md"
                  />
                  <div className="flex-1">
                    <input
                      type="file"
                      id="image-upload"
                      accept="image/jpeg,image/png"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById('image-upload')?.click()}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Upload New Image
                    </Button>
                    <p className="text-xs text-muted-foreground mt-2">
                      JPEG or PNG, max 2MB
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="full_name">
                    Full Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">
                    Email <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="specialization">
                    Specialization <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="specialization"
                    value={formData.specialization}
                    onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="years_of_experience">Years of Experience</Label>
                  <Input
                    id="years_of_experience"
                    type="number"
                    min="0"
                    max="50"
                    value={formData.years_of_experience}
                    onChange={(e) => setFormData({ ...formData, years_of_experience: parseInt(e.target.value) })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="education">Education</Label>
                <Input
                  id="education"
                  value={formData.education}
                  onChange={(e) => setFormData({ ...formData, education: e.target.value })}
                  placeholder="e.g., DDS from Harvard School of Dental Medicine"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="clinic_address">Clinic Address</Label>
                <Input
                  id="clinic_address"
                  value={formData.clinic_address}
                  onChange={(e) => setFormData({ ...formData, clinic_address: e.target.value })}
                  placeholder="e.g., 123 Dental St, Boston, MA"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact_info">Contact Information</Label>
                <Input
                  id="contact_info"
                  value={formData.contact_info}
                  onChange={(e) => setFormData({ ...formData, contact_info: e.target.value })}
                  placeholder="e.g., +1 (555) 123-4567"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Professional Bio</Label>
                <Textarea
                  id="bio"
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  rows={5}
                  placeholder="Tell patients about yourself..."
                />
              </div>

              <div className="space-y-4">
                <Label>Available Booking Times</Label>
                <p className="text-xs text-muted-foreground">
                  Set your available hours for each day (e.g., "09:00-17:00" or leave blank if unavailable)
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => (
                    <div key={day} className="space-y-2">
                      <Label htmlFor={day} className="capitalize">{day}</Label>
                      <Input
                        id={day}
                        placeholder="e.g., 09:00-17:00"
                        value={formData.available_times?.[day as keyof typeof formData.available_times] || ''}
                        onChange={(e) => setFormData({
                          ...formData,
                          available_times: {
                            ...formData.available_times,
                            [day]: e.target.value
                          }
                        })}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="submit" className="flex-1" disabled={isLoading}>
                  <Save className="w-4 h-4 mr-2" />
                  {isLoading ? 'Saving...' : 'Save Changes'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/doctors')}
                  disabled={isLoading}
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
