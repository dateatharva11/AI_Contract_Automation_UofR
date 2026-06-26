import React, { useState } from "react";
import { Link } from "wouter";
import { useContractsWithResponsible } from "@/hooks/use-contracts-with-responsible";
import { useVendors } from "@/hooks/use-vendors";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { exportContractsToExcel } from "@/lib/contracts-excel-export"; 
import { useToast } from "@/hooks/use-toast";
import { Search, Plus, FileText, ChevronRight, Filter, X, ArrowUpDown, ArrowUp, ArrowDown, Info, User, FileSpreadsheet, Download } from "lucide-react";
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
import { StatusHistorySidebar } from "@/components/status-history-sidebar";
import type { Contract } from "@shared/schema";

type SortField = 'projectName' | 'startDate' | 'budgetAmount' | 'createdAt';
type SortOrder = 'asc' | 'desc';

// Get unique responsible person options from contracts
const getAvailableResponsiblePersons = (contracts: any[]) => {
  if (!contracts) return [];
  const persons = new Set<string>();
  contracts.forEach(contract => {
    const responsible = (contract as any).responsiblePerson || getFallbackResponsible(contract.status);
    persons.add(responsible);
  });
  return Array.from(persons).sort();
};

export default function ContractsList() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: vendors } = useVendors();
  const { contracts: allContracts, isLoading: contractsLoading } = useContractsWithResponsible();
  const [search, setSearch] = useState("");
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedVendors, setSelectedVendors] = useState<string[]>([]);
  const [selectedResponsiblePersons, setSelectedResponsiblePersons] = useState<string[]>([]);
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  
  // Sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);

  // Get unique statuses, vendors, and responsible persons for filter options
  const availableStatuses = Array.from(new Set(allContracts?.map(c => c.status) || []));
  const availableVendors = vendors || [];
  const availableResponsiblePersons = getAvailableResponsiblePersons(allContracts || []);

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

  const handleOpenSidebar = (contract: Contract, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedContract(contract);
    setSidebarOpen(true);
  };

  const handleExportExcel = () => {
    if (filteredAndSortedContracts.length === 0) {
      toast({
        title: "Nothing to export",
        description: "No contracts match your current filters.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      exportContractsToExcel(filteredAndSortedContracts, vendors);
      toast({
        title: "Export successful",
        description: `${filteredAndSortedContracts.length} contract(s) exported to Excel.`,
      });
    } catch (error) {
      console.error("Error exporting to Excel:", error);
      toast({
        title: "Export failed",
        description: "There was an error exporting the contracts. Please try again.",
        variant: "destructive",
      });
    }
  };

  const filteredAndSortedContracts = React.useMemo(() => {
    if (!allContracts) return [];

    let filtered = allContracts.filter(c => {
      const responsiblePerson = (c as any).responsiblePerson || getFallbackResponsible(c.status);
      
      const matchesSearch = c.projectName.toLowerCase().includes(search.toLowerCase()) || 
        c.projectNumber.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = selectedStatuses.length === 0 || selectedStatuses.includes(c.status);
      const matchesVendor = selectedVendors.length === 0 || selectedVendors.includes(c.vendorId);
      const matchesResponsiblePerson = selectedResponsiblePersons.length === 0 || selectedResponsiblePersons.includes(responsiblePerson);
      
      return matchesSearch && matchesStatus && matchesVendor && matchesResponsiblePerson;
    });

    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case 'projectName':
          comparison = a.projectName.localeCompare(b.projectName);
          break;
        case 'startDate':
          comparison = new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
          break;
        case 'createdAt':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
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
  }, [allContracts, search, selectedStatuses, selectedVendors, selectedResponsiblePersons, sortField, sortOrder]);

  const clearAllFilters = () => {
    setSelectedStatuses([]);
    setSelectedVendors([]);
    setSelectedResponsiblePersons([]);
    setSearch("");
  };

  const hasActiveFilters = selectedStatuses.length > 0 || selectedVendors.length > 0 || selectedResponsiblePersons.length > 0 || search.length > 0;

  const getFilterCount = () => {
    return selectedStatuses.length + selectedVendors.length + selectedResponsiblePersons.length;
  };

  return (
    <>
      <div className="space-y-6 animate-in fade-in duration-500">
        {/* Header */}
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
          {/* Filter section */}
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
                        {getFilterCount()}
                      </span>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <Button 
                  variant="outline" 
                  className="rounded-full shadow-sm"
                  onClick={handleExportExcel}
                  disabled={contractsLoading || filteredAndSortedContracts.length === 0}
                >
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  Export as Excel
                </Button>
                <DropdownMenuContent className="w-64" align="start">
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
                  
                  <DropdownMenuSeparator />
                  
                  <DropdownMenuLabel>Filter by Responsible Person</DropdownMenuLabel>
                  {availableResponsiblePersons.map((person) => (
                    <DropdownMenuCheckboxItem
                      key={person}
                      checked={selectedResponsiblePersons.includes(person)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedResponsiblePersons([...selectedResponsiblePersons, person]);
                        } else {
                          setSelectedResponsiblePersons(selectedResponsiblePersons.filter(p => p !== person));
                        }
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <User className="w-3 h-3" />
                        <span>{person}</span>
                      </div>
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
                  Clear All Filters
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
                {selectedResponsiblePersons.map(person => (
                  <div key={person} className="bg-muted rounded-full px-3 py-1 text-xs flex items-center gap-2">
                    <User className="w-3 h-3" />
                    <span>{person}</span>
                    <button onClick={() => setSelectedResponsiblePersons(selectedResponsiblePersons.filter(p => p !== person))}>
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
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
                      className="px-6 py-4 font-medium cursor-pointer hover:bg-muted/70 transition-colors group"
                      onClick={() => handleSort('createdAt')}
                    >
                      <div className="flex items-center">
                        Draft Created
                        {getSortIcon('createdAt')}
                      </div>
                    </th>
                    <th 
                      className="px-6 py-4 font-medium hidden lg:table-cell cursor-pointer hover:bg-muted/70 transition-colors group"
                      onClick={() => handleSort('startDate')}
                    >
                      <div className="flex items-center">
                        Project Timeline
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
                    {/* Responsible Person Column */}
                    <th className="px-6 py-4 font-medium">
                      <div className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        Responsible
                      </div>
                    </th>
                    {/* Action Column: Contract Details (Info) - Opens Sidebar */}
                    <th className="px-6 py-4 font-medium text-center w-12">
                      <div className="flex items-center justify-center">
                        Info
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredAndSortedContracts.map((contract) => {
                    const vendor = vendors?.find(v => v.id === contract.vendorId);
                    const responsiblePerson = (contract as any).responsiblePerson || getFallbackResponsible(contract.status);
                    
                    return (
                      <tr key={contract.id} className="bg-card hover:bg-muted/30 transition-colors group">
                        {/* Project Details - Clickable Project Name */}
                        <td className="px-6 py-4">
                          <Link href={`/contracts/${contract.id}`}>
                            <div className="font-semibold text-foreground hover:text-primary hover:underline underline-offset-2 transition-colors cursor-pointer">
                              {contract.projectName}
                            </div>
                          </Link>
                          <div className="text-xs text-muted-foreground mt-1">#{contract.projectNumber}</div>
                        </td>
                        
                        {/* Vendor */}
                        <td className="px-6 py-4 hidden md:table-cell">
                          <div className="font-medium text-foreground">{vendor?.name || 'Unknown Vendor'}</div>
                        </td>
                        
                        {/* Draft Created Date */}
                        <td className="px-6 py-4">
                          <div className="font-medium">{format(new Date(contract.createdAt), 'MMM d, yyyy')}</div>
                        </td>
                        
                        {/* Project Timeline */}
                        <td className="px-6 py-4 hidden lg:table-cell text-muted-foreground">
                          <div>{format(new Date(contract.startDate), 'MMM d, yyyy')}</div>
                          <div className="text-xs text-muted-foreground/70">to {format(new Date(contract.endDate), 'MMM d, yyyy')}</div>
                        </td>
                        
                        {/* Budget */}
                        <td className="px-6 py-4 font-medium">
                          ${Number(contract.budgetAmount).toLocaleString()}
                        </td>
                        
                        {/* Status */}
                        <td className="px-6 py-4">
                          <StatusBadge status={contract.status} />
                        </td>
                        
                        {/* Responsible Person - Already loaded */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1 text-sm">
                            <User className="w-3 h-3 text-muted-foreground" />
                            <span>{responsiblePerson}</span>
                          </div>
                        </td>
                        
                        {/* Action Column: Contract Details (Info) - Opens Sidebar */}
                        <td className="px-6 py-4 text-center">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={(e) => handleOpenSidebar(contract, e)}
                            className="h-8 w-8 group-hover:bg-primary/10 group-hover:text-primary transition-colors"
                            title="View contract details & status history"
                          >
                            <Info className="w-4 h-4" />
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
                {hasActiveFilters && ` (filtered from ${allContracts?.length || 0} total)`}
              </span>
              <span className="text-xs">
                Sorted by: {sortField === 'projectName' ? 'Project Name' : sortField === 'createdAt' ? 'Draft Created Date' : sortField === 'startDate' ? 'Project Start Date' : 'Budget'} ({sortOrder === 'asc' ? 'Ascending' : 'Descending'})
              </span>
            </div>
          )}
        </Card>
      </div>

      {/* Status History Sidebar */}
      <StatusHistorySidebar
        open={sidebarOpen}
        onOpenChange={setSidebarOpen}
        contract={selectedContract}
        isLoading={false}
      />
    </>
  );
}

// Helper function for fallback
function getFallbackResponsible(status: string): string {
  switch (status) {
    case 'draft':
      return 'Contract Admininstrator (Admin)';
    case 'review':
      return 'Reviewer (Reviewer)';
    case 'approved':
    case 'signed':
      return 'Vendor (Vendor)';
    default:
      return '-';
  }
}