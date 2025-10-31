import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { DashboardLayout } from '@/components/DashboardLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from '@/components/Toaster'
import { Save } from 'lucide-react'

export default function CreateProfile() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  
  const [formData, setFormData] = useState({
    specialization: '',
    bio: '',
    years_of_experience: '',
    education: '',
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
    loadExistingProfile()
  }, [user])

  const loadExistingProfile = async () => {
    if (!user) return

    try {
      // Get user ID from email
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', user.email)
        .single()

      if (userError || !userData) return

      const userId = userData.id

      const { data, error } = await supabase
        .from('dentists')
        .select('*')
        .eq('id', userId)
        .single()

      if (data) {
        setFormData({
          specialization: data.specialization || '',
          bio: data.bio || '',
          years_of_experience: data.years_of_experience?.toString() || '',
          education: data.education || '',
          available_times: data.available_times || {
            monday: '',
            tuesday: '',
            wednesday: '',
            thursday: '',
            friday: '',
            saturday: '',
            sunday: '',
          },
        })
        setIsEditing(true)
      }
    } catch (error) {
      // Profile doesn't exist yet, that's okay
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setIsLoading(true)

    try {
      // Get or create profile
      let userId: string

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', user.email)
        .single()

      if (profileError && profileError.code === 'PGRST116') {
        // Profile doesn't exist, we need to create user first
        // For now, show error - user needs to exist in auth.users
        toast({
          title: 'Error',
          description: 'User account not found. Please contact administrator.',
          variant: 'destructive',
        })
        setIsLoading(false)
        return
      }

      if (!profileData) {
        toast({
          title: 'Error',
          description: 'Profile not found.',
          variant: 'destructive',
        })
        setIsLoading(false)
        return
      }

      userId = profileData.id

      // Upsert dentist profile
      const { error } = await supabase
        .from('dentists')
        .upsert({
          id: userId,
          specialization: formData.specialization,
          bio: formData.bio || null,
          years_of_experience: formData.years_of_experience ? parseInt(formData.years_of_experience) : null,
          education: formData.education || null,
          available_times: formData.available_times,
          rating: 5.0, // Default rating
        })

      if (error) throw error

      // Grant dentist role
      const { error: roleError } = await supabase
        .from('user_roles')
        .upsert({
          user_id: userId,
          role: 'dentist',
        })

      if (roleError && roleError.code !== '23505') { // Ignore duplicate key error
        console.error('Role error:', roleError)
      }

      toast({
        title: 'Success!',
        description: isEditing ? 'Profile updated successfully!' : 'Profile created successfully!',
      })

      navigate('/dashboard')
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
      <div className="max-w-2xl">
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl">
              {isEditing ? 'Edit Your Profile' : 'Create Your Dentist Profile'}
            </CardTitle>
            <p className="text-muted-foreground">
              This information will be displayed to patients on the main website
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="specialization">
                  Specialization <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="specialization"
                  placeholder="e.g., General Dentistry, Orthodontics, Cosmetic Dentistry"
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
                  placeholder="e.g., 10"
                  value={formData.years_of_experience}
                  onChange={(e) => setFormData({ ...formData, years_of_experience: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="education">Education</Label>
                <Input
                  id="education"
                  placeholder="e.g., DDS from Harvard School of Dental Medicine"
                  value={formData.education}
                  onChange={(e) => setFormData({ ...formData, education: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Where did you study? Include your degree and institution
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Professional Bio</Label>
                <Textarea
                  id="bio"
                  placeholder="Tell patients about yourself, your approach to dental care, and what makes you unique..."
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  rows={5}
                />
                <p className="text-xs text-muted-foreground">
                  This will help patients get to know you better
                </p>
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
                        value={formData.available_times[day as keyof typeof formData.available_times]}
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

              <div className="bg-secondary/50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">What happens next?</h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>✓ Your profile will appear in the dentist directory on the main website</li>
                  <li>✓ Patients can view your information and book appointments</li>
                  <li>✓ You'll receive notifications for new bookings</li>
                  <li>✓ You can update your profile anytime from the dashboard</li>
                </ul>
              </div>

              <div className="flex gap-3">
                <Button type="submit" className="flex-1" disabled={isLoading}>
                  <Save className="w-4 h-4 mr-2" />
                  {isLoading ? 'Saving...' : isEditing ? 'Update Profile' : 'Create Profile'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/dashboard')}
                  disabled={isLoading}
                >
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
