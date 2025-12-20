import { cn } from "@/lib/utils";

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("skeleton-loading rounded-lg", className)}
      {...props}
    />
  );
}

export { Skeleton };
