import { useState, useRef } from 'react';
import { Dentist } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Mail, Briefcase, GraduationCap, Award, Edit2, Camera, Loader2 } from 'lucide-react';
import ProfileEditForm from './ProfileEditForm';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface ProfileCardProps {
  dentist: Dentist;
  onUpdate?: (updatedDentist: Dentist) => void;
}

const ProfileCard = ({ dentist, onUpdate }: ProfileCardProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(dentist.photo_url || dentist.image_url);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
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
    const loadingToast = toast.loading('Uploading profile picture...');

    try {
      // Create unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `dentist-avatars/${dentist.id}_${Date.now()}.${fileExt}`;

      // Upload to Supabase storage
      const { error: uploadError } = await supabase.storage
        .from('medical-documents')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('medical-documents')
        .getPublicUrl(fileName);

      const publicUrl = urlData.publicUrl;

      // Update dentist table with new image URL
      const { error: updateError } = await supabase
        .from('dentists')
        .update({
          image_url: publicUrl,
          profile_picture: publicUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', dentist.id);

      if (updateError) throw updateError;

      // Update local state
      setAvatarUrl(publicUrl);

      // Update auth context
      const session = JSON.parse(localStorage.getItem('dentist_auth') || '{}');
      if (session) {
        session.dentist = { ...session.dentist, photo_url: publicUrl, image_url: publicUrl };
        localStorage.setItem('dentist_auth', JSON.stringify(session));
      }

      // Notify parent
      if (onUpdate) {
        onUpdate({
          ...dentist,
          photo_url: publicUrl,
          image_url: publicUrl,
        });
      }

      toast.success('Profile picture updated successfully!', { id: loadingToast });
    } catch (error: any) {
      console.error('Avatar upload error:', error);
      toast.error(error.message || 'Failed to upload profile picture', { id: loadingToast });
    } finally {
      setIsUploadingAvatar(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSave = async (updatedDentist: Dentist) => {
    // Update auth context with new dentist data
    const session = JSON.parse(localStorage.getItem('dentist_auth') || '{}');
    if (session) {
      session.dentist = updatedDentist;
      localStorage.setItem('dentist_auth', JSON.stringify(session));
    }

    if (onUpdate) {
      onUpdate(updatedDentist);
    }
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <ProfileEditForm
        dentist={dentist}
        onSave={handleSave}
        onCancel={() => setIsEditing(false)}
      />
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Profile Information</CardTitle>
          <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
            <Edit2 className="h-4 w-4 mr-2" />
            Edit Profile
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Avatar and Name */}
        <div className="flex items-center gap-4">
          {/* Avatar with upload overlay */}
          <div className="relative group">
            <Avatar className="h-20 w-20 cursor-pointer" onClick={handleAvatarClick}>
              <AvatarImage src={avatarUrl} alt={dentist.full_name} />
              <AvatarFallback className="text-lg bg-primary text-primary-foreground">
                {getInitials(dentist.full_name)}
              </AvatarFallback>
            </Avatar>

            {/* Upload overlay */}
            <div
              className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              onClick={handleAvatarClick}
            >
              {isUploadingAvatar ? (
                <Loader2 className="h-6 w-6 text-white animate-spin" />
              ) : (
                <Camera className="h-6 w-6 text-white" />
              )}
            </div>

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleAvatarUpload}
              className="hidden"
            />
          </div>

          <div>
            <h3 className="text-2xl font-bold">Dr. {dentist.full_name}</h3>
            <p className="text-muted-foreground">{dentist.specialization}</p>
            <p className="text-xs text-muted-foreground mt-1">Click avatar to change photo</p>
          </div>
        </div>

        {/* Details */}
        <div className="space-y-4">
          <div className="flex items-center gap-3 text-sm">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span>{dentist.email}</span>
          </div>

          {dentist.years_of_experience && (
            <div className="flex items-center gap-3 text-sm">
              <Briefcase className="h-4 w-4 text-muted-foreground" />
              <span>{dentist.years_of_experience} years of experience</span>
            </div>
          )}

          {dentist.education && (
            <div className="flex items-center gap-3 text-sm">
              <GraduationCap className="h-4 w-4 text-muted-foreground" />
              <span>{dentist.education}</span>
            </div>
          )}

          {dentist.bio && (
            <div className="pt-4 border-t">
              <div className="flex items-start gap-3 text-sm">
                <Award className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium mb-1">About</p>
                  <p className="text-muted-foreground">{dentist.bio}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ProfileCard;

