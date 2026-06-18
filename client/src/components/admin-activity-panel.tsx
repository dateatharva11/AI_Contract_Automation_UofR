import { useState, useMemo } from "react";
import { Link } from "wouter";
import { format } from "date-fns";
import { 
  Search, 
  ChevronDown, 
  ChevronUp, 
  ChevronLeft, 
  ChevronRight,
  Filter,
  X,
  Loader2,
  FileSpreadsheet,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { formatAuditAction } from "@/lib/format-audit-action";
import { useAdminActivity, type AdminActivityFilters, fetchAllAdminActivityForExport } from "@/hooks/use-admin-activity";
import { useUsers } from "@/hooks/use-users";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { exportAdminActivityToExcel, exportAdminActivityWithMetadata } from "@/lib/admin-activity-excel-export";

type SortConfig = {
  key: "createdAt" | "projectName" | "userFullName" | "action";
  direction: "asc" | "desc";
};

export function AdminActivityPanel() {
  const { toast } = useToast();
  const [filters, setFilters] = useState<AdminActivityFilters>({
    userIds: [],
    actions: [],
    search: "",
    sortBy: "createdAt",
    sortOrder: "desc",
    page: 1,
    pageSize: 25,
  });

  const [dateRange, setDateRange] = useState<{ from?: string; to?: string }>({});
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const { data: users, isLoading: usersLoading } = useUsers();
  const { data, isLoading, isFetching } = useAdminActivity(filters);

  const handleSort = (key: SortConfig["key"]) => {
    setFilters(prev => ({
      ...prev,
      sortBy: key,
      sortOrder: prev.sortBy === key && prev.sortOrder === "desc" ? "asc" : "desc",
    }));
  };

  const handlePageChange = (newPage: number) => {
    setFilters(prev => ({ ...prev, page: newPage }));
  };

  const handleSearch = (value: string) => {
    setFilters(prev => ({ ...prev, search: value, page: 1 }));
  };

  const toggleUser = (userId: number) => {
    setFilters(prev => ({
      ...prev,
      userIds: prev.userIds.includes(userId)
        ? prev.userIds.filter(id => id !== userId)
        : [...prev.userIds, userId],
      page: 1,
    }));
  };

  const clearFilters = () => {
    setFilters({
      userIds: [],
      actions: [],
      search: "",
      sortBy: "createdAt",
      sortOrder: "desc",
      page: 1,
      pageSize: 25,
    });
    setDateRange({});
  };

  const hasActiveFilters = useMemo(() => {
    return filters.userIds.length > 0 || 
           filters.search.length > 0 ||
           dateRange.from ||
           dateRange.to;
  }, [filters, dateRange]);

  // Handle Excel export
  const handleExportExcel = async () => {
    if (!data || data.total === 0) {
      toast({
        title: "Nothing to export",
        description: "There are no activity events to export.",
        variant: "destructive",
      });
      return;
    }

    setIsExporting(true);
    try {
      // Build export filters (without pagination)
      const exportFilters = {
        userIds: filters.userIds,
        actions: filters.actions,
        search: filters.search,
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
      };

      // Fetch all matching records
      const allItems = await fetchAllAdminActivityForExport(exportFilters);

      if (allItems.length === 0) {
        toast({
          title: "Nothing to export",
          description: "No activity events match the current filters.",
          variant: "destructive",
        });
        return;
      }

      // Generate filename with filter indicator
      const hasFilters = hasActiveFilters || filters.actions?.length > 0;
      const filename = `activity-log-${format(new Date(), "yyyy-MM-dd")}${
        hasFilters ? "-filtered" : ""
      }.xlsx`;

      // Export with metadata for better context
      exportAdminActivityWithMetadata(
        allItems,
        {
          userCount: filters.userIds?.length || 0,
          search: filters.search || undefined,
          dateRange: {
            from: filters.dateFrom,
            to: filters.dateTo,
          },
        },
        filename
      );

      toast({
        title: "Export successful",
        description: `${allItems.length} events exported to Excel.`,
      });
    } catch (error) {
      console.error("Export failed:", error);
      toast({
        title: "Export failed",
        description: error instanceof Error ? error.message : "Failed to export activity log.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const totalPages = data ? Math.ceil(data.total / filters.pageSize) : 0;

  const getSortIcon = (key: SortConfig["key"]) => {
    if (filters.sortBy !== key) return null;
    return filters.sortOrder === "asc" ? 
      <ChevronUp className="w-3 h-3" /> : 
      <ChevronDown className="w-3 h-3" />;
  };

  return (
    <div className="space-y-4">
      {/* Search and filter bar */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search contracts or users..."
            value={filters.search}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Filter className="w-4 h-4" />
              Filters
              {hasActiveFilters && (
                <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs">
                  {filters.userIds.length + (dateRange.from ? 1 : 0) + (dateRange.to ? 1 : 0)}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent side="bottom" align="start" className="w-80 max-h-[400px] overflow-y-auto">
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium mb-2">Users</h4>
                {usersLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {users?.map((user) => (
                      <label key={user.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 px-2 py-1 rounded">
                        <Checkbox
                          checked={filters.userIds.includes(user.id)}
                          onCheckedChange={() => toggleUser(user.id)}
                        />
                        <span>{user.fullName}</span>
                        <Badge variant="outline" className="ml-auto text-xs">
                          {user.role === "contract_manager" ? "Admin" : user.role}
                        </Badge>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h4 className="text-sm font-medium mb-2">Date Range</h4>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="date"
                    value={dateRange.from || ""}
                    onChange={(e) => {
                      setDateRange(prev => ({ ...prev, from: e.target.value }));
                      setFilters(prev => ({ ...prev, dateFrom: e.target.value || undefined, page: 1 }));
                    }}
                  />
                  <Input
                    type="date"
                    value={dateRange.to || ""}
                    onChange={(e) => {
                      setDateRange(prev => ({ ...prev, to: e.target.value }));
                      setFilters(prev => ({ ...prev, dateTo: e.target.value || undefined, page: 1 }));
                    }}
                  />
                </div>
              </div>

              <Button variant="outline" size="sm" className="w-full" onClick={clearFilters}>
                <X className="w-3 h-3 mr-2" />
                Clear all filters
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground">
            <X className="w-4 h-4 mr-1" />
            Clear
          </Button>
        )}

        {/* Export Excel Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleExportExcel}
          disabled={isExporting || isLoading || !data || data.total === 0}
          className="gap-2"
        >
          {isExporting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <FileSpreadsheet className="w-4 h-4" />
          )}
          {isExporting ? "Exporting..." : "Export Excel"}
        </Button>

        <div className="flex items-center gap-2 ml-auto">
          <span className="text-sm text-muted-foreground">
            {isFetching ? "Loading..." : `${data?.total || 0} events`}
          </span>
        </div>
      </div>

      {/* Results table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead className="border-b bg-muted/50">
                <tr className="text-left text-sm">
                  <th 
                    className="px-4 py-3 font-medium cursor-pointer hover:bg-muted/50 transition-colors min-w-[140px]"
                    onClick={() => handleSort("userFullName")}
                  >
                    <div className="flex items-center gap-1">
                      User
                      {getSortIcon("userFullName")}
                    </div>
                  </th>
                  <th 
                    className="px-4 py-3 font-medium cursor-pointer hover:bg-muted/50 transition-colors min-w-[180px]"
                    onClick={() => handleSort("action")}
                  >
                    <div className="flex items-center gap-1">
                      Action
                      {getSortIcon("action")}
                    </div>
                  </th>
                  <th 
                    className="px-4 py-3 font-medium cursor-pointer hover:bg-muted/50 transition-colors min-w-[220px]"
                    onClick={() => handleSort("projectName")}
                  >
                    <div className="flex items-center gap-1">
                      Contract
                      {getSortIcon("projectName")}
                    </div>
                  </th>
                  <th className="px-4 py-3 font-medium min-w-[100px]">Status</th>
                  <th 
                    className="px-4 py-3 font-medium cursor-pointer hover:bg-muted/50 transition-colors min-w-[160px]"
                    onClick={() => handleSort("createdAt")}
                  >
                    <div className="flex items-center gap-1">
                      Date
                      {getSortIcon("createdAt")}
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center">
                      <Loader2 className="w-5 h-5 animate-spin inline" />
                    </td>
                  </tr>
                ) : data?.items.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                      No activity found
                    </td>
                  </tr>
                ) : (
                  data?.items.map((item) => (
                    <tr key={item.id} className="border-b hover:bg-muted/30 transition-colors">
                      {/* User Column - Using Avatar component like layout */}
                      <td className="px-4 py-3">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center gap-2 cursor-help">
                                <Avatar className="h-8 w-8 bg-primary-foreground text-primary font-bold shadow-sm shrink-0">
                                  <AvatarFallback>{item.userFullName.charAt(0).toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <div className="min-w-0">
                                  <div className="text-sm font-medium whitespace-nowrap">
                                    {item.userFullName}
                                  </div>
                                  <Badge variant="outline" className="text-xs">
                                    {item.userRole === "contract_manager" ? "Admin" : item.userRole}
                                  </Badge>
                                </div>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{item.userFullName}</p>
                              <p className="text-xs text-muted-foreground">{item.userRole}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </td>

                      {/* Action Column */}
                      <td className="px-4 py-3">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="cursor-help">
                                <div className="text-sm font-medium whitespace-nowrap">
                                  {formatAuditAction(item.action)}
                                </div>
                                {item.details && (
                                  <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                                    {item.details}
                                  </div>
                                )}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="left" className="max-w-xs">
                              <p className="font-medium">{formatAuditAction(item.action)}</p>
                              {item.details && (
                                <p className="text-xs text-muted-foreground mt-1">{item.details}</p>
                              )}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </td>

                      {/* Contract Column */}
                      <td className="px-4 py-3">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Link href={`/contracts/${item.contractId}`}>
                                <div className="hover:text-primary transition-colors cursor-pointer">
                                  <div className="text-sm font-medium whitespace-normal break-words">
                                    {item.projectName}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    #{item.projectNumber}
                                  </div>
                                </div>
                              </Link>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-sm">
                              <p className="font-medium">{item.projectName}</p>
                              <p className="text-xs text-muted-foreground">#{item.projectNumber}</p>
                              <p className="text-xs text-muted-foreground mt-1">Click to view contract</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </td>

                      {/* Status Column */}
                      <td className="px-4 py-3">
                        <StatusBadge status={item.contractStatus} />
                      </td>

                      {/* Date Column */}
                      <td className="px-4 py-3">
                        <div className="text-sm whitespace-nowrap">
                          {item.createdAt ? format(new Date(item.createdAt), "MMM d, yyyy") : "—"}
                        </div>
                        <div className="text-xs text-muted-foreground whitespace-nowrap">
                          {item.createdAt ? format(new Date(item.createdAt), "h:mm a") : ""}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {data && data.total > 0 && (
        <div className="flex items-center justify-between flex-wrap gap-2">
          <p className="text-sm text-muted-foreground">
            Showing {((filters.page - 1) * filters.pageSize) + 1}–
            {Math.min(filters.page * filters.pageSize, data.total)} of {data.total}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(filters.page - 1)}
              disabled={filters.page <= 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm">
              Page {filters.page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(filters.page + 1)}
              disabled={filters.page >= totalPages}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}