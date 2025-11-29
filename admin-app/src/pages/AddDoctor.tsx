import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DashboardLayout } from '@/components/DashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import api from '@/lib/api'
import { AdminDentist, CreateDentistPayload, CreateDentistResponse, DayAvailability } from '@/types/admin'
import { toast } from '@/components/Toaster'
import { Upload, X } from 'lucide-react'
import { WeeklyAvailabilityInput } from '@/components/WeeklyAvailabilityInput'

const initialForm = {
  name: '',
  email: '',
  specialization: '',
  phone: '',
  years_of_experience: '',
  education: '',
  bio: '',
}

export default function AddDoctor() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState(initialForm)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [tempPassword, setTempPassword] = useState<string | null>(null)
  const [lastCreatedDentist, setLastCreatedDentist] = useState<AdminDentist | null>(null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [availability, setAvailability] = useState<DayAvailability[]>([])

  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: 'File too large',
          description: 'Avatar image must be less than 5MB',
          variant: 'destructive',
        })
        return
      }

      setAvatarFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const clearAvatar = () => {
    setAvatarFile(null)
    setAvatarPreview(null)
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSubmitting(true)
    setTempPassword(null)

    try {
      const payload: CreateDentistPayload = {
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        specialization: formData.specialization.trim(),
        phone: formData.phone.trim() || undefined,
        years_of_experience: formData.years_of_experience
          ? Number(formData.years_of_experience)
          : undefined,
        education: formData.education.trim() || undefined,
        bio: formData.bio.trim() || undefined,
        availability: availability.length > 0 ? availability : undefined,
      }

      const response = await api.post<CreateDentistResponse>('/admin/dentists', payload)
      setFormData(initialForm)
      setAvatarFile(null)
      setAvatarPreview(null)
      setAvailability([])
      setTempPassword(response.data.tempPassword)
      setLastCreatedDentist(response.data.dentist as AdminDentist)

      toast({
        title: 'Dentist created',
        description: `${payload.name} can now log into the dentist portal.`,
      })

      // Navigate to doctors page after a short delay to show success message
      setTimeout(() => {
        navigate('/doctors', { state: { refresh: true, newDentist: response.data.dentist } })
      }, 1500)
    } catch (error: any) {
      console.error('Error creating dentist:', error)
      
      // Extract detailed error message from backend response
      let errorMessage = 'Please try again later.';
      if (error.message) {
        errorMessage = error.message;
      } else if (error.response?.data?.error?.message) {
        errorMessage = error.response.data.error.message;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      toast({
        title: 'Failed to add dentist',
        description: errorMessage,
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Add New Dentist</h1>
          <p className="text-gray-500 mt-2">
            Create a dentist profile and automatically provision access to the dentist portal.
          </p>
        </div>

        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle>Profile Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-6" onSubmit={handleSubmit}>
              {/* Avatar Upload */}
              <div className="space-y-2">
                <Label>Profile Picture</Label>
                <div className="flex items-center gap-4">
                  {avatarPreview ? (
                    <div className="relative w-24 h-24">
                      <img
                        src={avatarPreview}
                        alt="Avatar preview"
                        className="w-full h-full rounded-full object-cover border-2 border-blue-200"
                      />
                      <button
                        type="button"
                        onClick={clearAvatar}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center border-2 border-dashed border-gray-300">
                      <Upload className="w-8 h-8 text-gray-400" />
                    </div>
                  )}
                  <div>
                    <input
                      type="file"
                      id="avatar"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      className="hidden"
                    />
                    <Label
                      htmlFor="avatar"
                      className="cursor-pointer inline-block px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
                    >
                      Choose Image
                    </Label>
                    <p className="text-sm text-gray-500 mt-1">PNG, JPG up to 5MB (Optional)</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    required
                    placeholder="Dr. Emily Rodriguez"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    required
                    placeholder="dentist@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="specialization">Specialization</Label>
                  <select
                    id="specialization"
                    value={formData.specialization}
                    onChange={(e) => handleChange('specialization', e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select specialization...</option>
                    <option value="General Dentistry">General Dentistry</option>
                    <option value="Orthodontics">Orthodontics</option>
                    <option value="Periodontics">Periodontics</option>
                    <option value="Endodontics">Endodontics</option>
                    <option value="Prosthodontics">Prosthodontics</option>
                    <option value="Oral Surgery">Oral Surgery</option>
                    <option value="Pediatric Dentistry">Pediatric Dentistry</option>
                    <option value="Cosmetic Dentistry">Cosmetic Dentistry</option>
                    <option value="Implant Dentistry">Implant Dentistry</option>
                    <option value="Restorative Dentistry">Restorative Dentistry</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="experience">Years of Experience</Label>
                  <Input
                    id="experience"
                    type="number"
                    min={0}
                    value={formData.years_of_experience}
                    onChange={(e) => handleChange('years_of_experience', e.target.value)}
                    placeholder="10"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="education">Education</Label>
                  <Input
                    id="education"
                    value={formData.education}
                    onChange={(e) => handleChange('education', e.target.value)}
                    placeholder="DDS, University of Michigan"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={formData.bio}
                  onChange={(e) => handleChange('bio', e.target.value)}
                  placeholder="Share a short biography to highlight experience, style of care, and specialties."
                  rows={5}
                />
              </div>

              {/* Weekly Availability Schedule */}
              <WeeklyAvailabilityInput
                value={availability}
                onChange={setAvailability}
              />

              <div className="flex items-center gap-3">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Creating...' : 'Create Dentist'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setFormData(initialForm)
                    clearAvatar()
                    setAvailability([])
                  }}
                  disabled={isSubmitting}
                >
                  Reset
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {tempPassword && lastCreatedDentist && (
          <Card className="border-0 shadow-lg bg-emerald-50 border-emerald-100">
            <CardHeader>
              <CardTitle className="text-emerald-700">Dentist Portal Credentials</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-emerald-900">
              <p>
                Share these credentials with the dentist so they can access the portal immediately.
              </p>
              <div className="bg-white rounded-lg p-4 shadow-inner space-y-1">
                <p>
                  <strong>Email:</strong> {lastCreatedDentist.email}
                </p>
                <p>
                  <strong>Temporary Password:</strong> {tempPassword}
                </p>
              </div>
              <p className="text-sm text-emerald-700">
                Remind the dentist to log in and update their profile information and password.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}
