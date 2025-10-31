import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { DentistCard } from "./DentistCard";
import { Dentist } from "@/types/admin";
import { Search, Users } from "lucide-react";

interface DentistListProps {
  dentists: Dentist[];
  onSelect: (dentist: Dentist) => void;
  selectedId?: string;
  isLoading?: boolean;
}

export const DentistList = ({ 
  dentists, 
  onSelect, 
  selectedId,
  isLoading = false 
}: DentistListProps) => {
  const [searchQuery, setSearchQuery] = useState("");

  // Filter dentists based on search query
  const filteredDentists = useMemo(() => {
    if (!searchQuery.trim()) {
      return dentists;
    }

    const query = searchQuery.toLowerCase();
    return dentists.filter(dentist => 
      dentist.full_name.toLowerCase().includes(query) ||
      dentist.email.toLowerCase().includes(query) ||
      dentist.specialization.toLowerCase().includes(query)
    );
  }, [dentists, searchQuery]);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          Dentists ({dentists.length})
        </CardTitle>
        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search by name, email, or specialization..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <DentistListSkeleton key={i} />
            ))}
          </div>
        ) : filteredDentists.length === 0 ? (
          <EmptyState 
            hasSearchQuery={!!searchQuery.trim()} 
            onClearSearch={() => setSearchQuery("")}
          />
        ) : (
          <div className="space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto pr-2">
            {filteredDentists.map((dentist) => (
              <DentistCard
                key={dentist.id}
                dentist={dentist}
                onSelect={() => onSelect(dentist)}
                isSelected={dentist.id === selectedId}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Skeleton loader for dentist list items
const DentistListSkeleton = () => {
  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <Skeleton className="w-10 h-10 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <div className="flex gap-2 mt-2">
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-6 w-16" />
          </div>
          <div className="flex justify-between mt-3">
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
      </div>
    </Card>
  );
};

// Empty state component
interface EmptyStateProps {
  hasSearchQuery: boolean;
  onClearSearch: () => void;
}

const EmptyState = ({ hasSearchQuery, onClearSearch }: EmptyStateProps) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Users className="w-16 h-16 text-muted-foreground/50 mb-4" />
      {hasSearchQuery ? (
        <>
          <h3 className="text-lg font-semibold mb-2">No dentists found</h3>
          <p className="text-sm text-muted-foreground mb-4">
            No dentists match your search criteria.
          </p>
          <button
            onClick={onClearSearch}
            className="text-sm text-primary hover:underline"
          >
            Clear search
          </button>
        </>
      ) : (
        <>
          <h3 className="text-lg font-semibold mb-2">No dentists registered</h3>
          <p className="text-sm text-muted-foreground">
            There are currently no dentists in the system.
          </p>
        </>
      )}
    </div>
  );
};
