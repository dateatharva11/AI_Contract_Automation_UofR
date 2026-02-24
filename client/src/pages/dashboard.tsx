import React from "react";
import { Link } from "wouter";
import { useContracts } from "@/hooks/use-contracts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { FileText, Clock, CheckCircle2, ShieldAlert, Plus, ArrowRight } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format } from "date-fns";

export default function Dashboard() {
  const { data: contracts, isLoading } = useContracts();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-10 w-48 bg-muted animate-pulse rounded-md" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-32 bg-muted animate-pulse rounded-xl" />)}
        </div>
        <div className="h-96 bg-muted animate-pulse rounded-xl mt-8" />
      </div>
    );
  }

  const activeContracts = contracts?.filter(c => c.status !== 'signed') || [];
  const inReview = contracts?.filter(c => c.status === 'in_review') || [];
  const flagged = contracts?.filter(c => {
    // Basic mock check to see if it has flagged items
    const ai = c.aiAnalysis as any;
    return ai && ai.flaggedClauses && ai.flaggedClauses.length > 0;
  }) || [];

  const chartData = [
    { name: "Drafts", value: contracts?.filter(c => c.status === 'draft').length || 0 },
    { name: "In Review", value: inReview.length },
    { name: "Approved", value: contracts?.filter(c => c.status === 'approved').length || 0 },
    { name: "Signed", value: contracts?.filter(c => c.status === 'signed').length || 0 },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Welcome back</h1>
          <p className="text-muted-foreground mt-1">Here's what's happening with your contracts today.</p>
        </div>
        <Button asChild className="hover-elevate shadow-md bg-primary hover:bg-primary/90 rounded-full px-6">
          <Link href="/contracts/new">
            <Plus className="w-4 h-4 mr-2" />
            Initiate Contract
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="hover-elevate glass-panel overflow-hidden relative">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <FileText className="w-16 h-16" />
          </div>
          <CardHeader className="pb-2">
            <CardDescription className="font-semibold text-primary">Active Contracts</CardDescription>
            <CardTitle className="text-4xl font-display">{activeContracts.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">+2 from last week</p>
          </CardContent>
        </Card>

        <Card className="hover-elevate glass-panel overflow-hidden relative">
          <div className="absolute top-0 right-0 p-4 opacity-10 text-amber-500">
            <Clock className="w-16 h-16" />
          </div>
          <CardHeader className="pb-2">
            <CardDescription className="font-semibold text-amber-600">Pending Review</CardDescription>
            <CardTitle className="text-4xl font-display">{inReview.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Needs your attention</p>
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
            <p className="text-xs text-muted-foreground">Clauses require negotiation</p>
          </CardContent>
        </Card>

        <Card className="hover-elevate glass-panel overflow-hidden relative">
          <div className="absolute top-0 right-0 p-4 opacity-10 text-emerald-500">
            <CheckCircle2 className="w-16 h-16" />
          </div>
          <CardHeader className="pb-2">
            <CardDescription className="font-semibold text-emerald-600">Cycle Time</CardDescription>
            <CardTitle className="text-4xl font-display">12<span className="text-xl text-muted-foreground ml-1">days</span></CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-emerald-600 font-medium">-15% improvement</p>
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
                  cursor={{fill: 'hsl(var(--muted))'}}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
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
              {contracts?.slice(0, 5).map(contract => (
                <Link key={contract.id} href={`/contracts/${contract.id}`}>
                  <div className="flex items-start gap-4 group cursor-pointer hover:bg-muted/50 p-2 -mx-2 rounded-lg transition-colors">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-primary group-hover:scale-110 transition-transform">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{contract.projectName}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <StatusBadge status={contract.status} />
                        <span className="text-xs text-muted-foreground truncate">{format(new Date(contract.createdAt!), 'MMM d, yyyy')}</span>
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
