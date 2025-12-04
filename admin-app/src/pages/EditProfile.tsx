import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { DashboardLayout } from '@/components/DashboardLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from '@/components/Toaster'
import { Save, Upload, X, Loader2 } from 'lucide-react'
import api from '@/lib/api'

interface DoctorProfile {
  id: string
  name: string
  email: string
  specialization: string
  years_of_experience: number
  bio: string
  image_url: string | null
  education?: string
  phone?: string
  status?: string
}

export default function EditProfile() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [originalData, setOriginalData] = useState<DoctorProfile | null>(null)

  const [formData, setFormData] = useState<DoctorProfile>({
    id: '',
    name: '',
    email: '',
    specialization: '',
    years_of_experience: 0,
    bio: '',
    image_url: null,
    education: '',
    phone: '',
    status: 'active',
  })

  useEffect(() => {
    loadDoctorProfile()
  }, [id])

  const loadDoctorProfile = async () => {
    if (!id) {
      toast({
        title: 'Error',
        description: 'No dentist ID provided',
        variant: 'destructive',
      })
      navigate('/doctors')
      return
    }

    try {
      setIsLoading(true)
      const response = await api.get(`/admin/dentists/${id}`)
      const dentist = response.data

      const profileData: DoctorProfile = {
        id: dentist.id,
        name: dentist.name || '',
        email: dentist.email || '',
        specialization: dentist.specialization || '',
        years_of_experience: dentist.years_of_experience || 0,
        bio: dentist.bio || '',
        image_url: dentist.image_url || dentist.profile_picture || null,
        education: dentist.education || '',
        phone: dentist.phone || '',
        status: dentist.status || 'active',
      }

      setFormData(profileData)
      setOriginalData(profileData)

      if (dentist.image_url || dentist.profile_picture) {
        setImagePreview(dentist.image_url || dentist.profile_picture)
      }
    } catch (error: any) {
      console.error('Error loading dentist:', error)
      toast({
        title: 'Failed to load dentist',
        description: error.message || 'Please try again',
        variant: 'destructive',
      })
      navigate('/doctors')
    } finally {
      setIsLoading(false)
    }
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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

    // Validate file size (2MB max for better performance)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Image must be less than 2MB',
        variant: 'destructive',
      })
      return
    }

    setImageFile(file)

    // Create preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setImagePreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const clearImage = () => {
    setImageFile(null)
    setImagePreview(formData.image_url)
  }

  // Check if form has changes
  const hasChanges = () => {
    if (!originalData) return false
    if (imageFile) return true // New image selected

    return (
      formData.name !== originalData.name ||
      formData.email !== originalData.email ||
      formData.specialization !== originalData.specialization ||
      formData.phone !== originalData.phone ||
      formData.years_of_experience !== originalData.years_of_experience ||
      formData.education !== originalData.education ||
      formData.bio !== originalData.bio
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!hasChanges()) {
      toast({
        title: 'No changes',
        description: 'No changes detected to save',
      })
      return
    }

    setIsSaving(true)

    try {
      const submitData: any = {
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        specialization: formData.specialization.trim(),
        phone: formData.phone?.trim() || '',
        years_of_experience: formData.years_of_experience,
        education: formData.education?.trim() || '',
        bio: formData.bio?.trim() || '',
        status: formData.status,
      }

      // If there's a new image, convert to base64 and include
      if (imageFile) {
        const reader = new FileReader()
        const base64Promise = new Promise<string>((resolve, reject) => {
          reader.onloadend = () => resolve(reader.result as string)
          reader.onerror = reject
          reader.readAsDataURL(imageFile)
        })

        try {
          submitData.image_url = await base64Promise
        } catch (error) {
          throw new Error('Failed to process image file')
        }
      }

      await api.put(`/admin/dentists/${id}`, submitData)

      toast({
        title: 'Success!',
        description: 'Dentist profile updated successfully!',
      })

      // Reload to refresh data
      await loadDoctorProfile()
      setImageFile(null)

      // Navigate back after a short delay
      setTimeout(() => {
        navigate('/doctors', { state: { refresh: true } })
      }, 500)
    } catch (error: any) {
      console.error('Error saving profile:', error)

      let errorMessage = 'Failed to save profile'
      if (error.message) {
        errorMessage = error.message
      } else if (error.response?.data?.error?.message) {
        errorMessage = error.response.data.error.message
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message
      }

      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
        duration: 5000,
      })
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-blue-500 mx-auto mb-4" />
            <p className="text-gray-500">Loading dentist profile...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  const formChanged = hasChanges()

  return (
    <DashboardLayout>
      <div className="max-w-4xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Edit Dentist Profile – {formData.name}</h1>
          <p className="text-gray-500 mt-1">Update dentist information and it will sync across all apps</p>
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
                  <div className="relative">
                    <img
                      src={imagePreview || formData.image_url || '/avatars/default.png.svg'}
                      alt="Profile preview"
                      className="w-24 h-24 rounded-full object-cover shadow-md"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/avatars/default.png.svg'
                      }}
                    />
                    {imageFile && (
                      <button
                        type="button"
                        onClick={clearImage}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <div className="flex-1">
                    <input
                      type="file"
                      id="image-upload"
                      accept="image/jpeg,image/png,image/jpg"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById('image-upload')?.click()}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {imageFile ? 'Change Image' : 'Upload New Image'}
                    </Button>
                    <p className="text-xs text-muted-foreground mt-2">
                      JPEG or PNG, max 2MB
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name">
                    Full Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
                  <select
                    id="specialization"
                    value={formData.specialization}
                    onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
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
                  <Label htmlFor="years_of_experience">Years of Experience</Label>
                  <Input
                    id="years_of_experience"
                    type="number"
                    min="0"
                    max="50"
                    value={formData.years_of_experience}
                    onChange={(e) => setFormData({ ...formData, years_of_experience: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+1 (555) 123-4567"
                  />
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

              <div className="flex gap-3 pt-4">
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={!formChanged || isSaving}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      {formChanged ? 'Save Changes' : 'No Changes to Save'}
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/doctors')}
                  disabled={isSaving}
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
