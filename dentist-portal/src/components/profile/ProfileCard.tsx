import { useState } from 'react';
import { Dentist } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Mail, Briefcase, GraduationCap, Award, Edit2 } from 'lucide-react';
import ProfileEditForm from './ProfileEditForm';
import { useAuth } from '@/hooks/useAuth';

interface ProfileCardProps {
  dentist: Dentist;
  onUpdate?: (updatedDentist: Dentist) => void;
}

const ProfileCard = ({ dentist, onUpdate }: ProfileCardProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
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
          <Avatar className="h-20 w-20">
            <AvatarImage src={dentist.photo_url} alt={dentist.full_name} />
            <AvatarFallback className="text-lg bg-primary text-primary-foreground">
              {getInitials(dentist.full_name)}
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="text-2xl font-bold">Dr. {dentist.full_name}</h3>
            <p className="text-muted-foreground">{dentist.specialization}</p>
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
