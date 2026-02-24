import React, { useState } from "react";
import { Link } from "wouter";
import { useContracts } from "@/hooks/use-contracts";
import { useVendors } from "@/hooks/use-vendors";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { Search, Plus, FileText, ChevronRight, Filter } from "lucide-react";
import { format } from "date-fns";

export default function ContractsList() {
  const { data: contracts, isLoading: contractsLoading } = useContracts();
  const { data: vendors } = useVendors();
  const [search, setSearch] = useState("");

  const filteredContracts = contracts?.filter(c => 
    c.projectName.toLowerCase().includes(search.toLowerCase()) || 
    c.projectNumber.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Contracts</h1>
          <p className="text-muted-foreground mt-1">Manage and track all university contracts.</p>
        </div>
        <Button asChild className="hover-elevate shadow-md bg-primary hover:bg-primary/90 rounded-full px-6">
          <Link href="/contracts/new">
            <Plus className="w-4 h-4 mr-2" />
            New Contract
          </Link>
        </Button>
      </div>

      <Card className="glass-panel overflow-hidden border-none shadow-lg">
        <div className="p-4 border-b border-border bg-card/50 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search by project name or number..." 
              className="pl-9 bg-background border-border shadow-sm rounded-full"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button variant="outline" className="rounded-full shadow-sm">
            <Filter className="w-4 h-4 mr-2" />
            Filter
          </Button>
        </div>

        <div className="overflow-x-auto">
          {contractsLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading contracts...</div>
          ) : filteredContracts?.length === 0 ? (
            <div className="p-12 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <FileText className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-bold">No contracts found</h3>
              <p className="text-muted-foreground mt-1 mb-4">Get started by creating a new contract.</p>
              <Button asChild><Link href="/contracts/new">Initiate Contract</Link></Button>
            </div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="text-xs uppercase bg-muted/50 text-muted-foreground border-b border-border">
                <tr>
                  <th className="px-6 py-4 font-medium">Project Details</th>
                  <th className="px-6 py-4 font-medium hidden md:table-cell">Vendor</th>
                  <th className="px-6 py-4 font-medium hidden lg:table-cell">Timeline</th>
                  <th className="px-6 py-4 font-medium">Budget</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredContracts?.map((contract) => {
                  const vendor = vendors?.find(v => v.id === contract.vendorId);
                  return (
                    <tr key={contract.id} className="bg-card hover:bg-muted/30 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-foreground">{contract.projectName}</div>
                        <div className="text-xs text-muted-foreground mt-1">#{contract.projectNumber}</div>
                      </td>
                      <td className="px-6 py-4 hidden md:table-cell">
                        <div className="font-medium text-foreground">{vendor?.name || 'Unknown Vendor'}</div>
                      </td>
                      <td className="px-6 py-4 hidden lg:table-cell text-muted-foreground">
                        {format(new Date(contract.startDate), 'MMM d, yyyy')} - {format(new Date(contract.endDate), 'MMM d, yyyy')}
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
      </Card>
    </div>
  );
}
