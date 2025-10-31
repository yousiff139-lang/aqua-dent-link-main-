import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface UnreadBadgeProps {
  count: number;
  className?: string;
}

export const UnreadBadge = ({ count, className }: UnreadBadgeProps) => {
  if (count === 0) return null;

  return (
    <Badge
      variant="destructive"
      className={cn(
        'absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs rounded-full',
        className
      )}
    >
      {count > 99 ? '99+' : count}
    </Badge>
  );
};
