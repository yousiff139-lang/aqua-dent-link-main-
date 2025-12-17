import { useState, useRef } from 'react';
import { Dentist } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Save, X, Camera, Loader2 } from 'lucide-react';
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
  const [avatarUrl, setAvatarUrl] = useState(dentist.photo_url || dentist.image_url);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Please upload a valid image (JPG, PNG, WebP, or GIF)');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    setIsUploadingAvatar(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `dentist-avatars/${dentist.id}_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('medical-documents')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('medical-documents')
        .getPublicUrl(fileName);

      setAvatarUrl(urlData.publicUrl);
      toast.success('Profile picture uploaded! Click Save to apply changes.');
    } catch (error: any) {
      console.error('Avatar upload error:', error);
      toast.error(error.message || 'Failed to upload image');
    } finally {
      setIsUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const loadingToast = toast.loading('Saving profile...');

    try {
      // Update in dentists table (including image URL)
      const { error: dentistError } = await supabase
        .from('dentists')
        .update({
          name: formData.full_name,
          email: formData.email,
          specialization: formData.specialization,
          years_of_experience: formData.years_of_experience,
          experience_years: formData.years_of_experience,
          education: formData.education,
          bio: formData.bio,
          image_url: avatarUrl,
          profile_picture: avatarUrl,
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
        await supabase
          .from('profiles')
          .update({
            full_name: formData.full_name,
            email: formData.email,
            avatar_url: avatarUrl,
            updated_at: new Date().toISOString(),
          })
          .eq('id', dentist.id);
      }

      const updatedDentist: Dentist = {
        ...dentist,
        ...formData,
        photo_url: avatarUrl,
        image_url: avatarUrl,
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
          {/* Avatar Upload Section */}
          <div className="flex items-center gap-4 pb-4 border-b">
            <div className="relative group">
              <Avatar className="h-24 w-24 cursor-pointer" onClick={handleAvatarClick}>
                <AvatarImage src={avatarUrl} alt={formData.full_name} />
                <AvatarFallback className="text-xl bg-primary text-primary-foreground">
                  {getInitials(formData.full_name)}
                </AvatarFallback>
              </Avatar>
              <div
                className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                onClick={handleAvatarClick}
              >
                {isUploadingAvatar ? (
                  <Loader2 className="h-8 w-8 text-white animate-spin" />
                ) : (
                  <Camera className="h-8 w-8 text-white" />
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleAvatarUpload}
                className="hidden"
              />
            </div>
            <div>
              <Label className="text-base font-semibold">Profile Picture</Label>
              <p className="text-sm text-muted-foreground">Click the avatar to upload a new photo</p>
              <p className="text-xs text-muted-foreground mt-1">JPG, PNG, WebP or GIF (max 5MB)</p>
            </div>
          </div>

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
            <Button type="submit" disabled={isSaving || isUploadingAvatar}>
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


