import React, { useState } from "react";
import { Link } from "wouter";
import { useContracts } from "@/hooks/use-contracts";
import { useVendors } from "@/hooks/use-vendors";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { Search, Plus, FileText, ChevronRight, Filter, X, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { format } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

type SortField = 'projectName' | 'startDate' | 'budgetAmount';
type SortOrder = 'asc' | 'desc';

export default function ContractsList() {
  const { user } = useAuth();
  const { data: contracts, isLoading: contractsLoading } = useContracts();
  const { data: vendors } = useVendors();
  const [search, setSearch] = useState("");
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedVendors, setSelectedVendors] = useState<string[]>([]);
  const [sortField, setSortField] = useState<SortField>('projectName');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  // Get unique statuses and vendors for filter options
  const availableStatuses = Array.from(new Set(contracts?.map(c => c.status) || []));
  const availableVendors = vendors || [];

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="w-4 h-4 ml-1" />;
    return sortOrder === 'asc' ? 
      <ArrowUp className="w-4 h-4 ml-1" /> : 
      <ArrowDown className="w-4 h-4 ml-1" />;
  };

  const filteredAndSortedContracts = React.useMemo(() => {
    if (!contracts) return [];

    // Apply filters
    let filtered = contracts.filter(c => {
      const matchesSearch = c.projectName.toLowerCase().includes(search.toLowerCase()) || 
        c.projectNumber.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = selectedStatuses.length === 0 || selectedStatuses.includes(c.status);
      const matchesVendor = selectedVendors.length === 0 || selectedVendors.includes(c.vendorId);
      return matchesSearch && matchesStatus && matchesVendor;
    });

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case 'projectName':
          comparison = a.projectName.localeCompare(b.projectName);
          break;
        case 'startDate':
          comparison = new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
          break;
        case 'budgetAmount':
          comparison = Number(a.budgetAmount) - Number(b.budgetAmount);
          break;
        default:
          comparison = 0;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [contracts, search, selectedStatuses, selectedVendors, sortField, sortOrder]);

  const clearAllFilters = () => {
    setSelectedStatuses([]);
    setSelectedVendors([]);
    setSearch("");
  };

  const hasActiveFilters = selectedStatuses.length > 0 || selectedVendors.length > 0 || search.length > 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Contracts</h1>
          <p className="text-muted-foreground mt-1">Manage and track all university contracts.</p>
        </div>
        {user.role === 'contract_manager' && (
          <Button asChild className="hover-elevate shadow-md bg-primary hover:bg-primary/90 rounded-full px-6">
            <Link href="/contracts/select-template">
              <Plus className="w-4 h-4 mr-2" />
              New Contract
            </Link>
          </Button>
        )}
      </div>

      <Card className="glass-panel overflow-hidden border-none shadow-lg">
        <div className="p-4 border-b border-border bg-card/50 flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Search by project name or number..." 
                className="pl-9 bg-background border-border shadow-sm rounded-full"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="rounded-full shadow-sm">
                  <Filter className="w-4 h-4 mr-2" />
                  Filter
                  {hasActiveFilters && (
                    <span className="ml-2 bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-xs">
                      {selectedStatuses.length + selectedVendors.length}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="start">
                <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
                {availableStatuses.map((status) => (
                  <DropdownMenuCheckboxItem
                    key={status}
                    checked={selectedStatuses.includes(status)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedStatuses([...selectedStatuses, status]);
                      } else {
                        setSelectedStatuses(selectedStatuses.filter(s => s !== status));
                      }
                    }}
                  >
                    <StatusBadge status={status} className="inline-block" />
                  </DropdownMenuCheckboxItem>
                ))}
                
                <DropdownMenuSeparator />
                
                <DropdownMenuLabel>Filter by Vendor</DropdownMenuLabel>
                {availableVendors.map((vendor) => (
                  <DropdownMenuCheckboxItem
                    key={vendor.id}
                    checked={selectedVendors.includes(vendor.id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedVendors([...selectedVendors, vendor.id]);
                      } else {
                        setSelectedVendors(selectedVendors.filter(v => v !== vendor.id));
                      }
                    }}
                  >
                    {vendor.name}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {hasActiveFilters && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={clearAllFilters}
                className="rounded-full"
              >
                <X className="w-4 h-4 mr-2" />
                Clear Filters
              </Button>
            )}
          </div>
          
          {/* Active filters display */}
          {hasActiveFilters && (
            <div className="flex flex-wrap gap-2">
              {search && (
                <div className="bg-muted rounded-full px-3 py-1 text-xs flex items-center gap-2">
                  <span>Search: {search}</span>
                  <button onClick={() => setSearch("")} className="hover:text-destructive">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
              {selectedStatuses.map(status => (
                <div key={status} className="bg-muted rounded-full px-3 py-1 text-xs flex items-center gap-2">
                  <StatusBadge status={status} className="text-xs" />
                  <button onClick={() => setSelectedStatuses(selectedStatuses.filter(s => s !== status))}>
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {selectedVendors.map(vendorId => {
                const vendor = vendors?.find(v => v.id === vendorId);
                return (
                  <div key={vendorId} className="bg-muted rounded-full px-3 py-1 text-xs flex items-center gap-2">
                    <span>{vendor?.name}</span>
                    <button onClick={() => setSelectedVendors(selectedVendors.filter(v => v !== vendorId))}>
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          {contractsLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading contracts...</div>
          ) : filteredAndSortedContracts.length === 0 ? (
            <div className="p-12 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <FileText className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-bold">No contracts found</h3>
              <p className="text-muted-foreground mt-1 mb-4">
                {hasActiveFilters 
                  ? "Try adjusting your filters to see more results." 
                  : "Get started by creating a new contract."}
              </p>
              {hasActiveFilters ? (
                <Button variant="outline" onClick={clearAllFilters} className="rounded-full px-6">
                  Clear All Filters
                </Button>
              ) : (
                <Button asChild className="rounded-full px-6">
                  <Link href="/contracts/select-template">Initiate Contract</Link>
                </Button>
              )}
            </div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="text-xs uppercase bg-muted/50 text-muted-foreground border-b border-border">
                <tr>
                  <th 
                    className="px-6 py-4 font-medium cursor-pointer hover:bg-muted/70 transition-colors group"
                    onClick={() => handleSort('projectName')}
                  >
                    <div className="flex items-center">
                      Project Details
                      {getSortIcon('projectName')}
                    </div>
                  </th>
                  <th className="px-6 py-4 font-medium hidden md:table-cell">Vendor</th>
                  <th 
                    className="px-6 py-4 font-medium hidden lg:table-cell cursor-pointer hover:bg-muted/70 transition-colors group"
                    onClick={() => handleSort('startDate')}
                  >
                    <div className="flex items-center">
                      Timeline
                      {getSortIcon('startDate')}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-4 font-medium cursor-pointer hover:bg-muted/70 transition-colors group"
                    onClick={() => handleSort('budgetAmount')}
                  >
                    <div className="flex items-center">
                      Budget
                      {getSortIcon('budgetAmount')}
                    </div>
                  </th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredAndSortedContracts.map((contract) => {
                  const vendor = vendors?.find(v => v.id === contract.vendorId);
                  return (
                    <tr key={contract.id} className="bg-card hover:bg-muted/30 transition-colors group">
                      <td className="px-6 py-4">
                        {/* <div className="font-semibold text-foreground">{contract.projectName}</div> */}
                        <Link href={`/contracts/${contract.id}`}>
                          <div className="font-semibold text-foreground hover:text-primary hover:underline underline-offset-2 transition-colors cursor-pointer">{contract.projectName}</div>
                        </Link>
                        <div className="text-xs text-muted-foreground mt-1">#{contract.projectNumber}</div>
                      </td>
                      <td className="px-6 py-4 hidden md:table-cell">
                        <div className="font-medium text-foreground">{vendor?.name || 'Unknown Vendor'}</div>
                      </td>
                      <td className="px-6 py-4 hidden lg:table-cell text-muted-foreground">
                        <div>{format(new Date(contract.startDate), 'MMM d, yyyy')}</div>
                        <div className="text-xs text-muted-foreground/70">to {format(new Date(contract.endDate), 'MMM d, yyyy')}</div>
                      </td> 
                      <td className="px-6 py-4 font-medium">
                        ${Number(contract.budgetAmount).toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={contract.status} />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button variant="ghost" size="icon" asChild className="group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                          <Link href={`/contracts/${contract.id}`}>
                            <ChevronRight className="w-4 h-4" />
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
        
        {/* Results count */}
        {!contractsLoading && filteredAndSortedContracts.length > 0 && (
          <div className="p-4 border-t border-border text-sm text-muted-foreground bg-muted/20 flex justify-between items-center">
            <span>
              Showing {filteredAndSortedContracts.length} contract{filteredAndSortedContracts.length !== 1 ? 's' : ''}
              {hasActiveFilters && ` (filtered from ${contracts?.length || 0} total)`}
            </span>
            <span className="text-xs">
              Sorted by: {sortField === 'projectName' ? 'Project Name' : sortField === 'startDate' ? 'Start Date' : 'Budget'} ({sortOrder === 'asc' ? 'Ascending' : 'Descending'})
            </span>
          </div>
        )}
      </Card>
    </div>
  );
}