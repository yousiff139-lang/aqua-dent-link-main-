import { useState, useEffect } from 'react';
import { Dentist } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Save, X } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

interface ProfileEditFormProps {
  dentist: Dentist;
  onSave: (updatedDentist: Dentist) => void;
  onCancel: () => void;
}

const ProfileEditForm = ({ dentist, onSave, onCancel }: ProfileEditFormProps) => {
  const [formData, setFormData] = useState({
    full_name: dentist.full_name,
    email: dentist.email,
    specialization: dentist.specialization,
    years_of_experience: dentist.years_of_experience || 0,
    education: dentist.education || '',
    bio: dentist.bio || '',
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const loadingToast = toast.loading('Saving profile...');

    try {
      // Update in dentists table
      const { error: dentistError } = await supabase
        .from('dentists')
        .update({
          name: formData.full_name,
          email: formData.email,
          specialization: formData.specialization,
          years_of_experience: formData.years_of_experience,
          experience_years: formData.years_of_experience, // Support both column names
          education: formData.education,
          bio: formData.bio,
          updated_at: new Date().toISOString(),
        })
        .eq('id', dentist.id);

      if (dentistError) throw dentistError;

      // Also update profiles table if linked
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', dentist.id)
        .single();

      if (profileData) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            full_name: formData.full_name,
            email: formData.email,
            updated_at: new Date().toISOString(),
          })
          .eq('id', dentist.id);

        if (profileError) {
          console.warn('Profile update warning:', profileError);
          // Don't fail if profile doesn't exist
        }
      }

      const updatedDentist: Dentist = {
        ...dentist,
        ...formData,
      };

      toast.success('Profile updated successfully!', { id: loadingToast });
      onSave(updatedDentist);
    } catch (error: any) {
      toast.error(error.message || 'Failed to update profile', { id: loadingToast });
      console.error('Profile update error:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit Profile</CardTitle>
        <CardDescription>Update your profile information. Changes will sync to the main website.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="full_name">Full Name</Label>
            <Input
              id="full_name"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="specialization">Specialization</Label>
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
              value={formData.years_of_experience}
              onChange={(e) => setFormData({ ...formData, years_of_experience: parseInt(e.target.value) || 0 })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="education">Education</Label>
            <Input
              id="education"
              value={formData.education}
              onChange={(e) => setFormData({ ...formData, education: e.target.value })}
              placeholder="e.g., DDS from Harvard University"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              rows={4}
              placeholder="Tell patients about yourself..."
            />
          </div>

          <div className="flex items-center gap-2 pt-4">
            <Button type="submit" disabled={isSaving}>
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default ProfileEditForm;

