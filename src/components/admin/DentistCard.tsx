import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dentist } from "@/types/admin";
import { User, Star, Calendar } from "lucide-react";

interface DentistCardProps {
  dentist: Dentist;
  onSelect: () => void;
  isSelected: boolean;
}

export const DentistCard = ({ dentist, onSelect, isSelected }: DentistCardProps) => {
  return (
    <Card
      className={`p-4 cursor-pointer transition-all hover:shadow-lg ${
        isSelected ? 'ring-2 ring-primary shadow-lg' : ''
      }`}
      onClick={onSelect}
    >
      <div className="flex items-start gap-3">
        <div className="bg-primary/10 p-2 rounded-full">
          <User className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-lg truncate">{dentist.full_name}</h3>
          <p className="text-sm text-muted-foreground truncate">{dentist.email}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge variant="secondary" className="text-xs">
              {dentist.specialization}
            </Badge>
            {dentist.years_of_experience && (
              <Badge variant="outline" className="text-xs">
                {dentist.years_of_experience} years
              </Badge>
            )}
          </div>
          <div className="mt-3 flex items-center justify-between text-sm">
            <div className="flex items-center gap-1 text-yellow-600">
              <Star className="w-4 h-4 fill-current" />
              <span className="font-medium">{dentist.rating.toFixed(1)}</span>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <Calendar className="w-4 h-4" />
              <span>{dentist.patient_count || 0} patients</span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};
