import React, { useState, useEffect } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { User } from "@shared/schema";
import { useContract, useUpdateContract, useGenerateDraft, useAnalyzeContract, useAuditLogs } from "@/hooks/use-contracts";
import { useAuth } from "@/hooks/use-auth";
import { queryClient } from "@/lib/queryClient";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RichTextEditor } from "@/components/rich-text-editor";
import { StatusBadge } from "@/components/status-badge";
import { ContractProgressBar } from "@/components/contract-progress-bar";
import { ReviewerSelector } from "@/components/reviewer-selector";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Wand2, ShieldAlert, CheckSquare, History, Check, Save, FileText, FileDown, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { ReviewChecklist } from "@/components/review-checklist";

export default function ContractWorkspace() {
  const { id } = useParams();
  const contractId = parseInt(id || "0", 10);
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: contract, isLoading, refetch: refetchContract } = useContract(contractId);
  const { mutate: updateContract, isPending: isSaving } = useUpdateContract();
  const { mutate: generateDraft, isPending: isGenerating } = useGenerateDraft();
  const { mutate: analyzeContract, isPending: isAnalyzing } = useAnalyzeContract();
  const { data: auditLogs, refetch: refetchAuditLogs } = useAuditLogs(contractId);

  const [localContent, setLocalContent] = useState("");
  const [localPlaceholderData, setLocalPlaceholderData] = useState<Record<string, any>>({});
  const [isRegeneratingDocx, setIsRegeneratingDocx] = useState(false);
  const [docxUrl, setDocxUrl] = useState<string | null>(null);
  // const [isGeneratingDocx, setIsGeneratingDocx] = useState(false);
  const [selectedReviewerId, setSelectedReviewerId] = useState<string>("");
  const [checklist, setChecklist] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [showReturnDialog, setShowReturnDialog] = useState(false);
  const [returnReason, setReturnReason] = useState("");
  const [returnType, setReturnType] = useState<"admin" | "reviewer" | null>(null);
  const [isReturning, setIsReturning] = useState(false);

  const { data: allUsers } = useQuery<User[]>({ queryKey: ["/api/users"] });
  const reviewers = allUsers?.filter(u => u.role === 'reviewer') || [];

  // Load contract data
  useEffect(() => {
    if (contract) {
      setLocalContent(contract.documentContent || "");
      setLocalPlaceholderData(contract.placeholder_data || {});
      setChecklist(contract.checklist || []);
    }
  }, [contract]);

  if (isLoading) {
    return <div className="flex h-full items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  if (!contract) return <div>Contract not found</div>;

  // Function to refresh all data after actions
  const refreshAllData = async () => {
    await Promise.all([
      refetchContract(),
      refetchAuditLogs(),
      queryClient.invalidateQueries({ queryKey: [api.contracts.get.path, contractId] }),
      queryClient.invalidateQueries({ queryKey: [api.notifications.list.path] })
    ]);
  };

  // Handle save with DOCX regeneration
  const handleSave = async () => {
    setIsRegeneratingDocx(true);
    try {
      await updateContract({ 
        id: contractId, 
        documentContent: localContent,
        placeholderData: localPlaceholderData,
        userId: user.id 
      });
      
      const response = await fetch(`/api/contracts/${contractId}/regenerate-docx`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ placeholderData: localPlaceholderData })
      });
      
      if (response.ok) {
        const { docxUrl } = await response.json();
        setDocxUrl(docxUrl);
        toast({ title: "Saved successfully with updated DOCX" });
      } else {
        toast({ title: "Saved but DOCX regeneration failed", variant: "destructive" });
      }
      
      // Refresh audit logs after save
      await refreshAllData();
    } catch (error) {
      toast({ title: "Save failed", variant: "destructive" });
    } finally {
      setIsRegeneratingDocx(false);
    }
  };

  const handleExportPDF = async () => {
    try {
      toast({
        title: "Generating PDF",
        description: "Please wait while we convert your document to PDF...",
      });
  
      // Call the backend PDF generation endpoint
      const response = await fetch(`/api/contracts/${contractId}/download-pdf`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to generate PDF: ${response.statusText}`);
      }
      
      // Get the PDF blob
      const blob = await response.blob();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Get filename from Content-Disposition header or create one
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `${contract.projectName || "contract"}_${contract.projectNumber || "draft"}.pdf`;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }
      
      link.download = filename;
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "PDF Generated Successfully",
        description: "Your PDF has been downloaded.",
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: "PDF Generation Failed",
        description: error instanceof Error ? error.message : "Failed to generate PDF. Please try again.",
        variant: "destructive",
      });
    }
  };  

  const handleExportDOCX = async () => {
    try {
      toast({
        title: "Downloading DOCX",
        description: "Please wait while we download the document...",
      });
  
      // Use the backend endpoint instead of direct Supabase URL
      const response = await fetch(`/api/contracts/${contractId}/download-docx`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to download: ${response.statusText}`);
      }
      
      // Get the blob
      const blob = await response.blob();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Get filename from Content-Disposition header or create one
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `${contract.projectName || "contract"}_${contract.projectNumber || "draft"}.docx`;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }
      
      link.download = filename;
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Download Successful",
        description: "DOCX has been downloaded successfully.",
      });
    } catch (error) {
      console.error('Error downloading DOCX:', error);
      toast({
        title: "Download Failed",
        description: error instanceof Error ? error.message : "Failed to download the document. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Check if all exhibits are attached
  const areAllExhibitsAttached = () => {
    if (!checklist || checklist.length === 0) return true;
    return checklist.every(item => item.done === true);
  };

  const getMissingExhibits = () => {
    if (!checklist) return [];
    return checklist.filter(item => !item.done).map(item => item.task);
  };

  const handleSubmitForReview = async () => {
    if (!areAllExhibitsAttached()) {
      const missingExhibits = getMissingExhibits();
      toast({
        title: "Cannot Submit for Review",
        description: `Please attach all required exhibits before submitting. Missing: ${missingExhibits.join(", ")}`,
        variant: "destructive",
      });
      return;
    }

    if (!selectedReviewerId) {
      toast({
        title: "Reviewer Required",
        description: "Please select a reviewer before submitting",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await updateContract({ 
        id: contractId, 
        status: 'review',
        userId: user.id 
      });
      
      const response = await fetch(`/api/contracts/${contractId}/assign-reviewer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewerId: parseInt(selectedReviewerId) }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to assign reviewer');
      }
      
      toast({
        title: "Success",
        description: "Contract submitted for review with all exhibits attached.",
      });
      
      // Refresh all data after submit
      await refreshAllData();
    } catch (error) {
      console.error('Error submitting for review:', error);
      toast({
        title: "Submission Failed",
        description: "Failed to submit contract for review. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = (newStatus: string) => {
    updateContract({ id: contractId, status: newStatus, userId: user.id }, {
      onSuccess: async () => {
        const messages: Record<string, string> = {
          'review': "Contract submitted for review. Reviewers have been notified.",
          'approved': "Contract approved. Vendor has been notified for signature.",
          'signed': "Contract signed successfully."
        };
        toast({ title: messages[newStatus] || "Status updated" });
        
        // Refresh all data after status change
        await refreshAllData();
      }
    });
  };

  const handleReturnToAdmin = async () => {
    setReturnType("admin");
    setShowReturnDialog(true);
  };
  
  const handleReturnToReviewer = async () => {
    setReturnType("reviewer");
    setShowReturnDialog(true);
  };

  const confirmReturn = async () => {
    setIsReturning(true);
    try {
      const endpoint = returnType === "admin" 
        ? `/api/contracts/${contractId}/return-to-admin`
        : `/api/contracts/${contractId}/return-to-reviewer`;
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          reason: returnReason,
          userId: user.id 
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to return contract');
      }
      
      toast({
        title: "Success",
        description: returnType === "admin" 
          ? "Contract returned to admin successfully" 
          : "Contract returned to reviewer successfully",
      });
      
      setShowReturnDialog(false);
      setReturnReason("");
      setReturnType(null);
      
      // Refresh all data after return
      await refreshAllData();
      
    } catch (error: any) {
      toast({
        title: "Return Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsReturning(false);
    }
  };

  // Mock parsed AI Data
  const aiData = contract.aiAnalysis ? (contract.aiAnalysis as any) : null;
  // const checklist = contract.checklist ? (contract.checklist as any[]) : null;

  if (isLoading) {
    return <div className="flex h-full items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  if (!contract) return <div>Contract not found</div>;

  const allExhibitsAttached = areAllExhibitsAttached();
  const missingExhibitsCount = getMissingExhibits().length;

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Progress Bar */}
      <ContractProgressBar status={contract.status} />

      {/* Workspace Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center shrink-0 mb-4 bg-card rounded-2xl p-4 shadow-sm border border-border gap-4 mx-4 mt-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-display font-bold text-foreground">{contract.projectName}</h1>
            <StatusBadge status={contract.status} />
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Project #{contract.projectNumber} | Budget: ${Number(contract.budgetAmount).toLocaleString()}
            <span className="mx-2">•</span>
            Draft created: {format(new Date(contract.createdAt), 'MMM d, yyyy')}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {user.role === 'contract_manager' && contract.status === 'draft' && (
            <div className="flex items-center gap-2">
              <ReviewerSelector
                reviewers={reviewers}
                selectedReviewerId={selectedReviewerId}
                onSelect={setSelectedReviewerId}
              />
              <Button 
                variant="outline" 
                className="hover-elevate bg-background"
                onClick={handleSubmitForReview}
                disabled={!selectedReviewerId || !allExhibitsAttached || isSubmitting}
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Check className="w-4 h-4 mr-2" />
                )}
                Submit for Review
              </Button>
            </div>
          )}
          
          {/* NEW: Return to Admin button for reviewers */}
          {user.role === 'reviewer' && contract.status === 'review' && (
            <Button 
              variant="destructive" 
              className="hover-elevate bg-orange-600 hover:bg-orange-700 text-white"
              onClick={handleReturnToAdmin}
            >
              <AlertTriangle className="w-4 h-4 mr-2" />
              Return to Admin
            </Button>
          )}
          
          {user.role === 'reviewer' && contract.status === 'review' && (
            <Button 
              className="hover-elevate bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => handleStatusChange('approved')}
            >
              Approve Contract
            </Button>
          )}
          
          {/* NEW: Return to Reviewer button for vendors */}
          {user.role === 'vendor' && contract.status === 'approved' && (
            <>
              <Button 
                variant="destructive" 
                className="hover-elevate bg-orange-600 hover:bg-orange-700 text-white"
                onClick={handleReturnToReviewer}
              >
                <AlertTriangle className="w-4 h-4 mr-2" />
                Return for Review
              </Button>
              <Button 
                className="hover-elevate bg-primary hover:bg-primary/90 text-white shadow-lg"
                onClick={() => handleStatusChange('signed')}
              >
                Sign Contract
              </Button>
            </>
          )}

          {/* Return Reason Dialog */}
          {showReturnDialog && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-card rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
                <h3 className="text-lg font-semibold mb-2">
                  {returnType === "admin" ? "Return Contract to Admin" : "Return Contract to Reviewer"}
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {returnType === "admin" 
                    ? "Please provide a reason for returning this contract to the administrator for revisions."
                    : "Please provide a reason for returning this contract to the reviewer for additional changes."}
                </p>
                
                <div className="mb-4">
                  <label className="text-sm font-medium mb-1 block">Reason for Return</label>
                  <textarea
                    className="w-full min-h-[100px] p-3 border border-border rounded-lg bg-background resize-y"
                    placeholder="Explain what changes are needed..."
                    value={returnReason}
                    onChange={(e) => setReturnReason(e.target.value)}
                  />
                </div>
                
                <div className="flex gap-3 justify-end">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setShowReturnDialog(false);
                      setReturnReason("");
                      setReturnType(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button 
                    variant="destructive"
                    onClick={confirmReturn}
                    disabled={isReturning}
                  >
                    {isReturning ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      "Confirm Return"
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Warning banner if exhibits are missing */}
      {user.role === 'contract_manager' && contract.status === 'draft' && !allExhibitsAttached && (
        <div className="mx-4 mb-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          <span className="text-sm text-amber-600 dark:text-amber-400">
            {missingExhibitsCount} exhibit{missingExhibitsCount !== 1 ? 's are' : ' is'} missing. Please attach all exhibits before submitting for review.
          </span>
        </div>
      )}

      {/* Main Split View - UPDATED for proper scrolling */}
      <div className="flex-1 flex flex-col md:flex-row gap-4 min-h-0 overflow-hidden">
        {/* Editor Pane - UPDATED with proper scrolling */}
        <Card className="flex-1 flex flex-col shadow-sm border-border overflow-hidden">
          <div className="bg-muted/50 border-b border-border p-2 flex justify-between items-center shrink-0">
            <div className="flex gap-2">
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-primary hover:bg-primary/10"
                onClick={() => generateDraft(contractId)}
                disabled={isGenerating || contract.status !== 'draft'}
              >
                {isGenerating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Wand2 className="w-4 h-4 mr-2" />}
                Generate Draft
              </Button>
            </div>
            <div className="flex items-center gap-2">
            <Button 
                size="sm" 
                variant="outline" 
                onClick={handleSave} 
                disabled={isSaving || localContent === contract.documentContent || user.role === 'vendor'}
                className="hover-elevate"
              >
                {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Save
              </Button>
              
              <Button 
                size="sm" 
                variant="outline" 
                onClick={handleExportPDF}
                disabled={!localContent || user.role === 'vendor'}
                className="hover-elevate text-green-600 hover:text-green-700 hover:bg-green-50 dark:text-green-500 dark:hover:bg-green-950"
              >
                <FileText className="w-4 h-4 mr-1" />
                PDF
              </Button>

              <Button 
                size="sm" 
                variant="outline" 
                onClick={handleExportDOCX}
                disabled={!localContent || user.role === 'vendor'}
                className="hover-elevate text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-500 dark:hover:bg-blue-950"
              >
                <FileDown className="w-4 h-4 mr-1" />
                DOCX
              </Button>
            </div>
          </div>
          
          {/* UPDATED: Editor container with proper scrolling */}
          <div className="flex-1 overflow-y-auto p-4 bg-card">
            <div className="min-h-full">
              <RichTextEditor
                htmlContent={localContent}
                placeholderData={localPlaceholderData}
                onChange={(newContent, newData) => {
                  setLocalContent(newContent);
                  setLocalPlaceholderData(newData);
                }}
                placeholder={isGenerating ? "Generating contract draft..." : "Document content will appear here..."}
                disabled={user.role === 'vendor'}
              />
            </div>
          </div>
        </Card>

        {/* AI & Context Pane */}
        <Card className="w-full md:w-[400px] flex flex-col shadow-sm border-border overflow-hidden bg-muted/10">
          <Tabs defaultValue="checklist" className="flex-1 flex flex-col overflow-hidden">
            <div className="border-b border-border p-2 shrink-0 bg-card">
              <TabsList className="w-full grid grid-cols-3 bg-muted/50 h-auto p-1">
                <TabsTrigger value="checklist" className="py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                  Checklist
                  {!allExhibitsAttached && contract.status === 'draft' && (
                    <span className="ml-2 w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                  )}
                </TabsTrigger>
                <TabsTrigger value="analysis" className="py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                  Analysis
                </TabsTrigger>
                <TabsTrigger value="history" className="py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                  History
                </TabsTrigger>
            </TabsList>
            </div>

            {/* UPDATED: Scrollable content area */}
            <div className="flex-1 overflow-y-auto p-4">
              <TabsContent value="checklist" className="m-0 space-y-4">
                  <ReviewChecklist 
                    contractId={contractId} 
                    contractStatus={contract.status}
                    onChecklistUpdate={(updatedChecklist) => {
                      setChecklist(updatedChecklist);
                    }}
                  />
              </TabsContent>

              <TabsContent value="analysis" className="m-0 space-y-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-display font-semibold">AI Assistant</h3>
                  <Button 
                    size="sm" 
                    variant="secondary"
                    onClick={() => analyzeContract(contractId)}
                    disabled={isAnalyzing || !contract.documentContent}
                  >
                    {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Run Analysis"}
                  </Button>
                </div>

                {!aiData ? (
                  <div className="text-center p-8 border border-dashed border-border rounded-xl bg-card text-muted-foreground">
                    <ShieldAlert className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Run analysis to review clauses and scope alignment.</p>
                  </div>
                ) : (
                  <div className="space-y-4 animate-in slide-in-from-right-4">
                    {/* Scope Score */}
                    <div className="bg-card p-4 rounded-xl border border-border shadow-sm">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-semibold text-sm">Scope Alignment</span>
                        <StatusBadge status={aiData.scopeScore > 80 ? "approved" : "review"} />
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div className="bg-primary h-2 rounded-full" style={{width: `${aiData.scopeScore || 0}%`}}></div>
                      </div>
                    </div>

                    {/* Flagged Clauses */}
                    <div>
                      <h4 className="text-sm font-semibold text-accent mb-2 flex items-center">
                        <ShieldAlert className="w-4 h-4 mr-1" /> Flagged Clauses ({aiData.flaggedClauses?.length || 0})
                      </h4>
                      <div className="space-y-2">
                        {aiData.flaggedClauses?.map((clause: any, i: number) => (
                          <div key={i} className="p-3 bg-accent/5 border border-accent/20 rounded-lg text-sm">
                            <p className="font-medium text-accent-foreground/90">{clause.section}</p>
                            <p className="text-muted-foreground mt-1 text-xs">{clause.reason}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="history" className="m-0">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-display font-semibold">Audit Trail</h3>
                </div>
                <div className="relative pl-3 border-l-2 border-muted space-y-6">
                  {auditLogs?.map((log) => (
                    <div key={log.id} className="relative">
                      <div className="absolute -left-[1.06rem] w-3 h-3 bg-background border-2 border-primary rounded-full mt-1.5" />
                      <div className="pl-3">
                        {/* Format the action text - replace underscores with spaces and capitalize properly */}
                        <p className="text-sm font-medium capitalize">
                          {log.action === 'returned to the admin' 
                            ? 'Returned to the admin' 
                            : log.action === 'returned to the reviewer'
                            ? 'Returned to the reviewer'
                            : log.action.replace(/_/g, ' ').charAt(0).toUpperCase() + log.action.replace(/_/g, ' ').slice(1)
                          }
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">{log.details}</p>
                        <p className="text-xs text-muted-foreground/60 mt-1">{format(new Date(log.createdAt!), 'MMM d, h:mm a')}</p>
                      </div>
                    </div>
                  ))}
                  {(!auditLogs || auditLogs.length === 0) && (
                    <p className="text-sm text-muted-foreground pl-3">No activity recorded yet.</p>
                  )}
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}