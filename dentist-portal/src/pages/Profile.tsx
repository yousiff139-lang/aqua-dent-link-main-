import { useAuth } from '@/hooks/useAuth';
import { useDentist } from '@/hooks/useDentist';
import ProfileCard from '@/components/profile/ProfileCard';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle } from 'lucide-react';

const Profile = () => {
  const { dentist: authDentist } = useAuth();
  const { dentist, isLoading, error, refetch } = useDentist(authDentist?.email);

  const handleUpdate = async (updatedDentist: Dentist) => {
    // Refresh the dentist data
    if (refetch) {
      await refetch();
    }
  };

  if (isLoading) {
    return (
      <div>
        <h1 className="text-3xl font-bold mb-6">Profile</h1>
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-4">
              <Skeleton className="h-20 w-20 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !dentist) {
    return (
      <div>
        <h1 className="text-3xl font-bold mb-6">Profile</h1>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <p>{error || 'Failed to load profile'}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Profile</h1>
      <ProfileCard dentist={dentist} onUpdate={handleUpdate} />
    </div>
  );
};

export default Profile;
