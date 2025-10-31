import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface ErrorDisplayProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}

export function ErrorDisplay({
  title = "Something went wrong",
  message,
  onRetry,
  retryLabel = "Try Again",
  className,
}: ErrorDisplayProps) {
  return (
    <Card className={className}>
      <CardContent className="p-12">
        <div className="flex flex-col items-center justify-center gap-4">
          <AlertCircle className="h-16 w-16 text-destructive" />
          <div className="text-center">
            <h3 className="text-xl font-semibold mb-2">{title}</h3>
            <p className="text-muted-foreground mb-6 max-w-md">{message}</p>
          </div>
          {onRetry && (
            <Button onClick={onRetry} size="lg" variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" />
              {retryLabel}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
