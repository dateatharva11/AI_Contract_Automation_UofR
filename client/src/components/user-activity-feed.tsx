import { Link } from "wouter";
import { format } from "date-fns";
import { FileText, Loader2, Clock, ChevronRight } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { formatAuditAction } from "@/lib/format-audit-action";
import type { UserActivityItem } from "@/hooks/use-user-activity";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

type Props = {
  items: UserActivityItem[] | undefined;
  isLoading?: boolean;
  emptyMessage?: string;
};

export function UserActivityFeed({ 
  items, 
  isLoading, 
  emptyMessage = "No activity yet." 
}: Props) {
  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  
  if (!items?.length) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <FileText className="w-12 h-12 text-muted-foreground/30 mb-3" />
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <Link key={item.id} href={`/contracts/${item.contractId}`}>
          <Card className="hover:shadow-md transition-all duration-200 cursor-pointer border-muted/50 hover:border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                {/* Avatar - Same style as layout */}
                <div className="hidden sm:flex">
                  <Avatar className="h-10 w-10 bg-primary-foreground text-primary font-bold shadow-sm shrink-0">
                    <AvatarFallback>{item.userFullName.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                </div>
                
                {/* Content */}
                <div className="flex-1 min-w-0 space-y-1.5">
                  {/* Header: Action and Date */}
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="w-4 h-4 text-primary/70 shrink-0 sm:hidden" />
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-sm font-medium truncate max-w-[200px] sm:max-w-[300px] md:max-w-[400px]">
                              {formatAuditAction(item.action)}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{formatAuditAction(item.action)}</p>
                            {item.details && (
                              <p className="text-xs text-muted-foreground mt-1">{item.details}</p>
                            )}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <span className="text-xs text-muted-foreground whitespace-nowrap flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {item.createdAt ? format(new Date(item.createdAt), "MMM d, h:mm a") : "—"}
                      </span>
                    </div>
                    
                    {/* Status Badge */}
                    <StatusBadge status={item.contractStatus} className="shrink-0" />
                  </div>
                  
                  {/* Contract Info */}
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground cursor-help">
                          <span className="font-medium text-foreground truncate max-w-[200px] sm:max-w-[350px] md:max-w-[500px]">
                            {item.projectName}
                          </span>
                          <span className="text-xs">#{item.projectNumber}</span>
                          <ChevronRight className="w-3 h-3 ml-auto text-muted-foreground/50 hidden sm:block" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="max-w-sm">
                        <p className="font-medium">{item.projectName}</p>
                        <p className="text-xs text-muted-foreground">#{item.projectNumber}</p>
                        <p className="text-xs text-muted-foreground mt-1">Status: {item.contractStatus}</p>
                        {item.details && (
                          <p className="text-xs text-muted-foreground mt-1 border-t pt-1">
                            {item.details}
                          </p>
                        )}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  
                  {/* User info */}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary/40"></span>
                      {item.userFullName}
                    </span>
                    {item.details && (
                      <span className="text-xs text-muted-foreground/70 truncate max-w-[200px] sm:max-w-[400px]">
                        • {item.details}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
      
      {/* Footer showing total count */}
      <div className="text-xs text-muted-foreground text-center pt-2 border-t">
        Showing {items.length} total events
      </div>
    </div>
  );
}