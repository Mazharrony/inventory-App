import { Skeleton } from "@/components/ui/skeleton";

export const TableSkeleton = () => (
  <div className="space-y-2 w-full">
    {[...Array(5)].map((_, i) => (
      <div key={i} className="flex gap-4 p-4 border rounded-lg">
        <Skeleton className="w-12 h-12 rounded-md" />
        <div className="flex-1 space-y-2">
          <Skeleton className="w-3/4 h-4" />
          <Skeleton className="w-1/2 h-3" />
        </div>
        <Skeleton className="w-20 h-8" />
      </div>
    ))}
  </div>
);

export const CardSkeleton = () => (
  <div className="space-y-4">
    <Skeleton className="w-full h-48 rounded-lg" />
    <div className="space-y-2">
      <Skeleton className="w-3/4 h-6" />
      <Skeleton className="w-full h-4" />
      <Skeleton className="w-2/3 h-4" />
    </div>
    <div className="flex gap-2 pt-2">
      <Skeleton className="flex-1 h-10 rounded-lg" />
      <Skeleton className="flex-1 h-10 rounded-lg" />
    </div>
  </div>
);

export const GridSkeleton = ({ columns = 3 }: { columns?: number }) => (
  <div className={`grid grid-cols-${columns} gap-4 w-full`}>
    {[...Array(columns)].map((_, i) => (
      <div key={i} className="space-y-3">
        <Skeleton className="w-full h-40 rounded-lg" />
        <Skeleton className="w-3/4 h-5" />
        <Skeleton className="w-1/2 h-4" />
      </div>
    ))}
  </div>
);

export const FormSkeleton = () => (
  <div className="space-y-4 w-full">
    {[...Array(3)].map((_, i) => (
      <div key={i} className="space-y-2">
        <Skeleton className="w-24 h-4" />
        <Skeleton className="w-full h-10 rounded-lg" />
      </div>
    ))}
    <div className="flex gap-2 pt-4">
      <Skeleton className="flex-1 h-10 rounded-lg" />
      <Skeleton className="w-24 h-10 rounded-lg" />
    </div>
  </div>
);

export const StatsSkeleton = () => (
  <div className="grid grid-cols-4 gap-4 w-full">
    {[...Array(4)].map((_, i) => (
      <div key={i} className="p-4 border rounded-lg space-y-2">
        <Skeleton className="w-12 h-8" />
        <Skeleton className="w-20 h-4" />
      </div>
    ))}
  </div>
);
