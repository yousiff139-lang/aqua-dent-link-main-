import { useState } from 'react'
import { DashboardLayout } from '@/components/DashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import api from '@/lib/api'
import { AdminDentist, CreateDentistPayload, CreateDentistResponse } from '@/types/admin'
import { toast } from '@/components/Toaster'

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
  const [formData, setFormData] = useState(initialForm)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [tempPassword, setTempPassword] = useState<string | null>(null)
  const [lastCreatedDentist, setLastCreatedDentist] = useState<AdminDentist | null>(null)

  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
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
      }

      const response = await api.post<CreateDentistResponse>('/admin/dentists', payload)
      setFormData(initialForm)
      setTempPassword(response.data.tempPassword)
      setLastCreatedDentist(response.data.dentist as AdminDentist)

      toast({
        title: 'Dentist created',
        description: `${payload.name} can now log into the dentist portal.`,
      })
    } catch (error: any) {
      console.error('Error creating dentist:', error)
      toast({
        title: 'Failed to add dentist',
        description: error.message || 'Please try again later.',
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
                  <Input
                    id="specialization"
                    value={formData.specialization}
                    onChange={(e) => handleChange('specialization', e.target.value)}
                    required
                    placeholder="Orthodontics, Cosmetic Dentistry, etc."
                  />
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

              <div className="flex items-center gap-3">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Creating...' : 'Create Dentist'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setFormData(initialForm)}
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
