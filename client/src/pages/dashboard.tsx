import React from "react";
import { Link } from "wouter";
import { useContracts } from "@/hooks/use-contracts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { FileText, Clock, CheckCircle2, ShieldAlert, Plus, ArrowRight, Info, Building2, Users } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format } from "date-fns";
import { useAuth } from "@/hooks/use-auth";

// Custom tooltip component
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border bg-background p-2 shadow-md">
        <p className="text-sm font-medium">
          {label}: {payload[0].value}
        </p>
      </div>
    );
  }
  return null;
};

// Helper function to fetch status history for a contract
async function fetchContractSignedDate(contractId: number): Promise<Date | null> {
  try {
    const res = await fetch(`/api/contracts/${contractId}/status-history`);
    const data = await res.json();
    
    if (data.success && data.statusHistory) {
      // Find the signed status entry
      const signedEntry = data.statusHistory.find((item: any) => item.status === 'signed');
      if (signedEntry) {
        // The signed entry's startDate is when it entered signed status
        return new Date(signedEntry.startDate);
      }
    }
    return null;
  } catch (error) {
    console.error(`Failed to fetch status history for contract ${contractId}:`, error);
    return null;
  }
}

// Helper function to calculate average cycle time for signed contracts
async function calculateAverageCycleTime(contracts: any[] | undefined): Promise<number | null> {
  if (!contracts || contracts.length === 0) return null;
  
  // Filter only signed contracts
  const signedContracts = contracts.filter(c => c.status === 'signed');
  
  if (signedContracts.length === 0) return null;
  
  let totalLifecycleDays = 0;
  let validContractsCount = 0;
  
  // For each signed contract, fetch its status history to get the signed date
  for (const contract of signedContracts) {
    const startDate = new Date(contract.createdAt);
    startDate.setHours(0, 0, 0, 0);
    
    // Get the signed date from status history
    const signedDate = await fetchContractSignedDate(contract.id);
    
    if (signedDate) {
      signedDate.setHours(0, 0, 0, 0);
      
      // Calculate difference in days
      const diffTime = signedDate.getTime() - startDate.getTime();
      const days = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
      
      totalLifecycleDays += days;
      validContractsCount++;
    } else {
      // Fallback: try to use lastActivityAt or endDate if status history not available
      if (contract.lastActivityAt) {
        const endDate = new Date(contract.lastActivityAt);
        endDate.setHours(0, 0, 0, 0);
        const diffTime = endDate.getTime() - startDate.getTime();
        const days = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
        totalLifecycleDays += days;
        validContractsCount++;
      } else if (contract.endDate) {
        const endDate = new Date(contract.endDate);
        endDate.setHours(0, 0, 0, 0);
        const diffTime = endDate.getTime() - startDate.getTime();
        const days = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
        totalLifecycleDays += days;
        validContractsCount++;
      }
    }
  }
  
  if (validContractsCount === 0) return null;
  
  // Calculate average (rounded to nearest integer)
  return Math.round(totalLifecycleDays / validContractsCount);
}

export default function Dashboard() {
  const { user } = useAuth();
  const { data: contracts, isLoading } = useContracts();
  const [averageCycleTime, setAverageCycleTime] = React.useState<number | null>(null);
  const [signedContractsCount, setSignedContractsCount] = React.useState(0);
  const [calculating, setCalculating] = React.useState(false);

  // Calculate average cycle time when contracts load
  React.useEffect(() => {
    async function computeCycleTime() {
      if (contracts && contracts.length > 0 && !calculating) {
        setCalculating(true);
        const avg = await calculateAverageCycleTime(contracts);
        setAverageCycleTime(avg);
        setSignedContractsCount(contracts.filter(c => c.status === 'signed').length);
        setCalculating(false);
      }
    }
    
    computeCycleTime();
  }, [contracts]);

  // Sort contracts by lastActivityAt (most recent first) for recent activity
  const recentContracts = React.useMemo(() => {
    if (!contracts) return [];
    return [...contracts]
      .sort((a, b) => {
        const dateA = new Date(a.lastActivityAt || a.createdAt || 0);
        const dateB = new Date(b.lastActivityAt || b.createdAt || 0);
        return dateB.getTime() - dateA.getTime();
      })
      .slice(0, 5);
  }, [contracts]);
  
  const activeContracts = contracts?.filter(c => c.status !== 'signed') || [];
  
  // New metrics
  const contractsWithUniversity = contracts?.filter(c => c.status === 'draft' || c.status === 'review') || [];
  const contractsWithVendor = contracts?.filter(c => c.status === 'approved') || [];
  
  const flagged = contracts?.filter(c => {
    const ai = c.aiAnalysis as any;
    return ai && ai.flaggedClauses && ai.flaggedClauses.length > 0;
  }) || [];

  const chartData = [
    { name: "Drafts", value: contracts?.filter(c => c.status === 'draft').length || 0 },
    { name: "Review", value: contracts?.filter(c => c.status === 'review').length || 0 },
    { name: "Approved", value: contractsWithVendor.length },
    { name: "Signed", value: signedContractsCount },
  ];

  if (isLoading || calculating) {
    return (
      <div className="space-y-4">
        <div className="h-10 w-48 bg-muted animate-pulse rounded-md" />
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {[1,2,3,4,5].map(i => <div key={i} className="h-32 bg-muted animate-pulse rounded-xl" />)}
        </div>
        <div className="h-96 bg-muted animate-pulse rounded-xl mt-8" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Welcome back</h1>
          <p className="text-muted-foreground mt-1">Here's what's happening with your contracts today.</p>
        </div>
        {user?.role === 'contract_manager' && (
          <Button asChild className="hover-elevate shadow-md bg-primary hover:bg-primary/90 rounded-full px-6">
            <Link href="/contracts/select-template">
              <Plus className="w-4 h-4 mr-2" />
              Initiate Contract
            </Link>
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
        <Card className="hover-elevate glass-panel overflow-hidden relative">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <FileText className="w-16 h-16" />
          </div>
          <CardHeader className="pb-2">
            <CardDescription className="font-semibold text-primary">Active Contracts</CardDescription>
            <CardTitle className="text-4xl font-display">{activeContracts.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Contracts in progress</p>
          </CardContent>
        </Card>

        {/* Card 2: Contracts with University (Drafts + Review) */}
        <Card className="hover-elevate glass-panel overflow-hidden relative">
          <div className="absolute top-0 right-0 p-4 opacity-10 text-blue-500">
            <Building2 className="w-16 h-16" />
          </div>
          <CardHeader className="pb-2">
            <CardDescription className="font-semibold text-blue-600 flex items-center gap-1">
              <Building2 className="w-4 h-4" />
              Contracts
            </CardDescription>
            <CardTitle className="text-4xl font-display">{contractsWithUniversity.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Contracts in university's court</p>
          </CardContent>
        </Card>

        {/* Card 3: Contracts with Vendor (Approved) */}
        <Card className="hover-elevate glass-panel overflow-hidden relative">
          <div className="absolute top-0 right-0 p-4 opacity-10 text-yellow-500">
            <Users className="w-16 h-16" />
          </div>
          <CardHeader className="pb-2">
            <CardDescription className="font-semibold text-yellow-600 flex items-center gap-1">
              <Users className="w-4 h-4" />
              Vendor Contracts
            </CardDescription>
            <CardTitle className="text-4xl font-display">{contractsWithVendor.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Contracts in vendor's court</p>
          </CardContent>
        </Card>

        <Card className="hover-elevate glass-panel overflow-hidden relative">
          <div className="absolute top-0 right-0 p-4 opacity-10 text-accent">
            <ShieldAlert className="w-16 h-16" />
          </div>
          <CardHeader className="pb-2">
            <CardDescription className="font-semibold text-accent">AI Flagged</CardDescription>
            <CardTitle className="text-4xl font-display">{flagged.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Clauses requiring attention</p>
          </CardContent>
        </Card>

        <Card className="hover-elevate glass-panel overflow-hidden relative">
          <div className="absolute top-0 right-0 p-4 opacity-10 text-emerald-500">
            <CheckCircle2 className="w-16 h-16" />
          </div>
          <CardHeader className="pb-2">
            <CardDescription className="font-semibold text-emerald-600 flex items-center gap-1">
              Average Cycle Time
            </CardDescription>
            <CardTitle className="text-4xl font-display">
              {averageCycleTime !== null ? (
                <>{averageCycleTime}<span className="text-xl text-muted-foreground ml-1">days</span></>
              ) : (
                <span className="text-2xl text-muted-foreground">No data</span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {averageCycleTime !== null 
                ? `${signedContractsCount} signed contract${signedContractsCount !== 1 ? 's' : ''}`
                : 'No signed contracts yet'}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 glass-panel hover-elevate">
          <CardHeader>
            <CardTitle className="font-display">Contract Pipeline</CardTitle>
            <CardDescription>Volume of contracts by stage</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: 'hsl(var(--muted-foreground))'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: 'hsl(var(--muted-foreground))'}} />
                <Tooltip 
                  content={<CustomTooltip />}
                  cursor={{fill: 'hsl(var(--muted))'}}
                />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} maxBarSize={50} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="glass-panel hover-elevate flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="font-display">Recent Activity</CardTitle>
              <CardDescription>Latest contracts updated</CardDescription>
            </div>
            <Button variant="ghost" size="icon" asChild>
              <Link href="/contracts"><ArrowRight className="w-4 h-4"/></Link>
            </Button>
          </CardHeader>
          <CardContent className="flex-1">
            <div className="space-y-5">
              {recentContracts.map(contract => (
                <Link key={contract.id} href={`/contracts/${contract.id}`}>
                  <div className="flex items-start gap-4 group cursor-pointer hover:bg-muted/50 p-2 -mx-2 rounded-lg transition-colors">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-primary group-hover:scale-110 transition-transform">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{contract.projectName}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <StatusBadge status={contract.status} />
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(contract.lastActivityAt || contract.createdAt!), 'MMM d, yyyy')}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
              {(!contracts || contracts.length === 0) && (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No contracts yet. Create one to get started.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
