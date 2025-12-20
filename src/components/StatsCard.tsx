import { LucideIcon } from "lucide-react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  iconColor?: string;
}

export const StatsCard = ({ title, value, icon: Icon, iconColor = 'bg-primary' }: StatsCardProps) => {
  return (
    <Card className="p-3 sm:p-4 h-28 sm:h-32 flex flex-col hover:shadow-lg transition-shadow">
      <CardHeader className="p-0 flex-1">
        <div className="flex items-center justify-between h-full">
          <div className="flex-1 min-w-0">
            <p className="text-xs sm:text-sm text-muted-foreground mb-1 font-medium">{title}</p>
            <p className="text-lg sm:text-xl md:text-2xl font-semibold text-foreground break-words">{value}</p>
          </div>
          <div className={`w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-lg ${iconColor} flex-shrink-0 ml-3 sm:ml-4`}>
            <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-primary-foreground" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0 mt-2 sm:mt-3 text-xs text-muted-foreground">
        {/* reserved for small hint or sparkline later */}
      </CardContent>
    </Card>
  );
};
