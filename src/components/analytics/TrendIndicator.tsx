import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface TrendIndicatorProps {
  current: number;
  previous: number;
  label?: string;
  formatValue?: (value: number) => string;
}

export const TrendIndicator = ({ 
  current, 
  previous, 
  label,
  formatValue = (val) => val.toFixed(2)
}: TrendIndicatorProps) => {
  const change = current - previous;
  const percentChange = previous !== 0 ? ((change / previous) * 100) : 0;
  const isPositive = change > 0;
  const isNegative = change < 0;
  const isNeutral = change === 0;

  return (
    <div className="flex items-center gap-2 text-sm">
      {isPositive && <TrendingUp className="h-4 w-4 text-gray-700" />}
      {isNegative && <TrendingDown className="h-4 w-4 text-gray-700" />}
      {isNeutral && <Minus className="h-4 w-4 text-gray-500" />}
      <span className={`font-medium ${
        isPositive ? 'text-gray-900' : 
        isNegative ? 'text-gray-700' : 
        'text-gray-600'
      }`}>
        {isPositive ? '+' : ''}{formatValue(change)} ({isPositive ? '+' : ''}{percentChange.toFixed(1)}%)
      </span>
      {label && <span className="text-muted-foreground text-xs">vs {label}</span>}
    </div>
  );
};

