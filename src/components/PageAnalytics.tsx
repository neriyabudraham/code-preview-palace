
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Eye, Calendar } from "lucide-react";
import { usePageAnalytics } from "@/hooks/usePageAnalytics";

interface PageAnalyticsProps {
  publishedPageId: string;
  className?: string;
}

export const PageAnalytics = ({ publishedPageId, className = "" }: PageAnalyticsProps) => {
  const { totalVisits, last30DaysVisits, isLoading, error } = usePageAnalytics(publishedPageId);

  if (isLoading) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="animate-pulse bg-slate-600 h-5 w-12 rounded"></div>
        <div className="animate-pulse bg-slate-600 h-5 w-16 rounded"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`text-xs text-slate-500 ${className}`}>
        לא ניתן לטעון נתונים
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 text-xs ${className}`}>
      <Badge variant="outline" className="border-emerald-400 text-emerald-400 px-2 py-1">
        <Eye size={12} className="mr-1" />
        {totalVisits} צפיות
      </Badge>
      <Badge variant="outline" className="border-blue-400 text-blue-400 px-2 py-1">
        <Calendar size={12} className="mr-1" />
        {last30DaysVisits} ב-30 ימים
      </Badge>
      {last30DaysVisits > 0 && (
        <TrendingUp size={12} className="text-emerald-400" />
      )}
    </div>
  );
};
