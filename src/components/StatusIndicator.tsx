import { cn } from "@/lib/utils";

interface StatusIndicatorProps {
  status: "running" | "stopped" | "unknown" | "not-found";
  label: string;
  className?: string;
}

export function StatusIndicator({
  status,
  label,
  className,
}: StatusIndicatorProps) {
  const getStatusConfig = () => {
    switch (status) {
      case "running":
        return {
          color: "bg-success",
          text: "Running",
          textColor: "text-success-foreground",
          bgColor: "bg-success/10",
        };
      case "stopped":
        return {
          color: "bg-destructive",
          text: "Stopped",
          textColor: "text-destructive-foreground",
          bgColor: "bg-destructive/10",
        };
      case "not-found":
        return {
          color: "bg-muted",
          text: "Not found",
          textColor: "text-muted-foreground",
          bgColor: "bg-muted/10",
        };
      default:
        return {
          color: "bg-warning",
          text: "Unknown",
          textColor: "text-warning-foreground",
          bgColor: "bg-warning/10",
        };
    }
  };

  const config = getStatusConfig();

  return (
    <div
      className={cn(
        "flex items-center justify-between p-4 rounded-lg border border-border",
        className
      )}
    >
      <div className="flex items-center gap-3">
        <div className={cn("w-3 h-3 rounded-full", config.color)} />
        <span className="text-foreground font-medium">{label}</span>
      </div>
      <div
        className={cn(
          "px-3 py-1 rounded-full text-sm font-medium",
          config.bgColor,
          config.textColor
        )}
      >
        {config.text}
      </div>
    </div>
  );
}
