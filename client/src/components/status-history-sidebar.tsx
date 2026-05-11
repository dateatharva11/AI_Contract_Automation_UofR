import React from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CalendarDays, Clock, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import type { Contract } from "@shared/routes";

interface StatusHistorySidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contract: Contract | null;
  isLoading: boolean;
}

interface StatusHistoryItem {
  status: string;
  startDate: string | Date;
  endDate: string | Date | null;
  durationDays: number;
  displayLabel: string;
  icon: string;
  color: string;
}

const statusBadgeBg: Record<string, string> = {
  draft: "bg-gray-500",
  review: "bg-amber-500",
  approved: "bg-emerald-500",
  signed: "bg-blue-500",
};

export function StatusHistorySidebar({ open, onOpenChange, contract, isLoading }: StatusHistorySidebarProps) {
  const [statusHistory, setStatusHistory] = React.useState<StatusHistoryItem[]>([]);
  const [totalLifecycleDays, setTotalLifecycleDays] = React.useState(0);
  const [isCompleted, setIsCompleted] = React.useState(false);
  const [loadingHistory, setLoadingHistory] = React.useState(false);

  React.useEffect(() => {
    if (open && contract?.id) {
      fetchStatusHistory();
    }
  }, [open, contract?.id]);

  const fetchStatusHistory = async () => {
    if (!contract?.id) return;
    setLoadingHistory(true);
    try {
      const res = await fetch(`/api/contracts/${contract.id}/status-history`);
      const data = await res.json();
      if (data.success) {
        setStatusHistory(data.statusHistory);
        setTotalLifecycleDays(data.totalLifecycleDays);
        setIsCompleted(data.isCompleted);
      }
    } catch (error) {
      console.error("Failed to fetch status history:", error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-700';
      case 'review': return 'bg-amber-100 text-amber-700';
      case 'approved': return 'bg-emerald-100 text-emerald-700';
      case 'signed': return 'bg-blue-100 text-blue-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusDisplayName = (status: string) => {
    switch (status) {
      case 'draft': return 'Draft';
      case 'review': return 'Review';
      case 'approved': return 'Approved';
      case 'signed': return 'Signed';
      default: return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };

  const formatDateRange = (startDateValue: string | Date, endDateValue: string | Date | null, status: string) => {
    // Convert to Date objects
    const startDate = startDateValue instanceof Date ? startDateValue : new Date(startDateValue);
    const start = format(startDate, 'MMM d, yyyy');
    
    if (!endDateValue) {
      return `${start} – Present`;
    }
    
    const endDate = endDateValue instanceof Date ? endDateValue : new Date(endDateValue);
    
    // For same day, just show the single date
    const startDay = startDate.toDateString();
    const endDay = endDate.toDateString();
    if (startDay === endDay) {
      return start;
    }
    
    return `${start} – ${format(endDate, 'MMM d, yyyy')}`;
  };

  // Helper to safely format a single date
  const formatDate = (dateValue: string | Date | null | undefined) => {
    if (!dateValue) return 'N/A';
    const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
    return format(date, 'MMM d, yyyy');
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[450px] sm:w-[540px] overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-2">
            <span>Contract Details</span>
            {contract && (
              <Badge className={getStatusBadgeColor(contract.status)}>
                {getStatusDisplayName(contract.status)}
              </Badge>
            )}
          </SheetTitle>
          <SheetDescription>
            {contract?.projectName} • #{contract?.projectNumber}
          </SheetDescription>
        </SheetHeader>

        <Separator className="my-4" />

        {isLoading || loadingHistory ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <>
            {/* Contract Summary */}
            <div className="mb-6 p-4 bg-muted/30 rounded-lg">
              <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                <CalendarDays className="w-4 h-4" />
                Contract Summary
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Draft Created:</span>
                  <span>{formatDate(contract?.contractStartDate)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Project Timeline:</span>
                  <span>{formatDate(contract?.startDate)} - {formatDate(contract?.endDate)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Budget:</span>
                  <span className="font-medium">${contract?.budgetAmount?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Vendor:</span>
                  <span>{contract?.vendorName || 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* Status History Timeline */}
            <div className="mb-6">
              <h4 className="font-semibold text-sm mb-4 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Status History & Duration
              </h4>
              
              {statusHistory.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No status history available yet.
                </div>
              ) : (
                <div className="relative pl-6 space-y-6">
                  {/* Vertical timeline line */}
                  <div className="absolute left-[11px] top-3 bottom-3 w-0.5 bg-border" />
                  
                  {statusHistory.map((item, index) => (
                    <div key={index} className="relative">
                      {/* Timeline dot */}
                      <div 
                        className={`absolute -left-[21px] w-4 h-4 rounded-full border-2 border-background ${statusBadgeBg[item.status] || 'bg-gray-500'}`}
                      />
                      
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-base">{item.icon}</span>
                          <span className="font-medium text-foreground">{item.displayLabel}</span>
                          
                          {/* Duration Badge - Only show if duration > 0 */}
                          {item.durationDays > 0 && (
                            <Badge variant="outline" className="text-xs">
                              {item.durationDays} day{item.durationDays !== 1 ? 's' : ''}
                            </Badge>
                          )}
                          {item.durationDays === 0 && item.endDate && (
                            <Badge variant="outline" className="text-xs text-muted-foreground">
                              0 days
                            </Badge>
                          )}
                          
                          {/* Status indicators */}
                          {!item.endDate && item.status === 'signed' && (
                            <Badge className="bg-green-100 text-green-700 text-xs">Completed</Badge>
                          )}
                          {!item.endDate && item.status !== 'signed' && (
                            <Badge variant="outline" className="text-xs text-amber-500 border-amber-200">
                              In Progress
                            </Badge>
                          )}
                        </div>
                        
                        {/* Date range */}
                        <div className="text-xs text-muted-foreground">
                          {formatDateRange(item.startDate, item.endDate, item.status)}
                        </div>
                        
                        {/* Duration text (if has meaningful duration) */}
                        {item.durationDays > 0 && item.endDate && (
                          <div className="text-xs text-muted-foreground/70">
                            Duration: {item.durationDays} day{item.durationDays !== 1 ? 's' : ''}
                          </div>
                        )}
                        {item.durationDays === 0 && item.endDate && item.status !== 'draft' && (
                          <div className="text-xs text-muted-foreground/50 italic">
                            Same-day transition
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Separator className="my-4" />

            {/* Summary Box */}
            <div className={`p-4 rounded-lg ${isCompleted ? 'bg-emerald-50 dark:bg-emerald-950/20' : 'bg-primary/5'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Lifecycle Duration</p>
                  <p className="text-2xl font-bold">{totalLifecycleDays} days</p>
                  {!isCompleted && statusHistory.length > 0 && totalLifecycleDays > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      (Since {formatDate(statusHistory[0]?.startDate)})
                    </p>
                  )}
                </div>
                {isCompleted && (
                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="w-5 h-5" />
                    <span className="text-sm font-medium">Contract Completed</span>
                  </div>
                )}
              </div>
              
              {statusHistory.length > 0 && !isCompleted && (
                <div className="mt-3 pt-3 border-t border-border/50">
                  <p className="text-xs text-muted-foreground">
                    Breakdown: {statusHistory.filter(i => i.durationDays > 0).map((i, idx) => 
                      `${i.displayLabel} ${i.durationDays}d`
                    ).join(' / ')}
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}