import { cn } from "@/lib/utils";

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "skeleton-loading rounded-lg bg-gradient-to-r from-muted via-muted/50 to-muted animate-pulse",
        className
      )}
      {...props}
    />
  );
}

export { Skeleton };
