import { LucideIcon } from "lucide-react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  iconColor?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
}

export const StatsCard = ({ 
  title, 
  value, 
  icon: Icon, 
  iconColor = 'bg-primary',
  trend,
  trendValue
}: StatsCardProps) => {
  return (
    <Card className="group relative overflow-hidden p-4 sm:p-5 h-32 sm:h-36 flex flex-col hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-border/60 bg-gradient-to-br from-card to-card/95 backdrop-blur-sm">
      {/* Animated background gradient on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      {/* Decorative corner accent */}
      <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-primary/10 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      <CardHeader className="p-0 flex-1 relative z-10">
        <div className="flex items-start justify-between h-full">
          <div className="flex-1 min-w-0 space-y-1">
            <p className="text-xs sm:text-sm text-muted-foreground font-medium uppercase tracking-wide">{title}</p>
            <p className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground break-words leading-tight bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text">
              {value}
            </p>
            {trend && trendValue && (
              <div className={cn(
                "flex items-center gap-1 text-xs font-medium mt-1",
                trend === 'up' && "text-success",
                trend === 'down' && "text-destructive",
                trend === 'neutral' && "text-muted-foreground"
              )}>
                <span>{trendValue}</span>
              </div>
            )}
          </div>
          <div className={cn(
            "w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center rounded-xl flex-shrink-0 ml-3 sm:ml-4 transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 shadow-lg",
            iconColor
          )}>
            <Icon className="w-6 h-6 sm:w-7 sm:h-7 text-primary-foreground drop-shadow-sm" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0 mt-2 text-xs text-muted-foreground relative z-10">
        {/* Subtle bottom border accent */}
        <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-primary/0 via-primary/30 to-primary/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      </CardContent>
    </Card>
  );
};
