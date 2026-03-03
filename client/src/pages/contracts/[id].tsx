import React, { useState, useEffect } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { User } from "@shared/schema";
import { useContract, useUpdateContract, useGenerateDraft, useAnalyzeContract, useAuditLogs } from "@/hooks/use-contracts";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Wand2, ShieldAlert, CheckSquare, History, Check, Save } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Editor } from '@tinymce/tinymce-react';

export default function ContractWorkspace() {
  const { id } = useParams();
  const contractId = parseInt(id || "0", 10);
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: contract, isLoading } = useContract(contractId);
  const { mutate: updateContract, isPending: isSaving } = useUpdateContract();
  const { mutate: generateDraft, isPending: isGenerating } = useGenerateDraft();
  const { mutate: analyzeContract, isPending: isAnalyzing } = useAnalyzeContract();
  const { data: auditLogs } = useAuditLogs(contractId);

  const [localContent, setLocalContent] = useState("");
  const [selectedReviewerId, setSelectedReviewerId] = useState<string>("");

  const { data: allUsers } = useQuery<User[]>({ queryKey: ["/api/users"] });
  const reviewers = allUsers?.filter(u => u.role === 'reviewer') || [];

  useEffect(() => {
    if (contract?.documentContent && !localContent) {
      setLocalContent(contract.documentContent);
    }
  }, [contract?.documentContent]);

  if (isLoading) {
    return <div className="flex h-full items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  if (!contract) return <div>Contract not found</div>;

  const handleSave = () => {
    updateContract({ id: contractId, documentContent: localContent }, {
      onSuccess: () => toast({ title: "Saved successfully" })
    });
  };

  const handleStatusChange = (newStatus: string) => {
    updateContract({ id: contractId, status: newStatus }, {
      onSuccess: () => {
        const messages: Record<string, string> = {
          'in_review': "Contract submitted for review. Reviewers have been notified.",
          'approved': "Contract approved. Vendor has been notified for signature.",
          'signed': "Contract signed successfully."
        };
        toast({ title: messages[newStatus] || "Status updated" });
      }
    });
  };

  // Mock parsed AI Data
  const aiData = contract.aiAnalysis ? (contract.aiAnalysis as any) : null;
  const checklist = contract.checklist ? (contract.checklist as any[]) : null;

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Workspace Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center shrink-0 mb-4 bg-card rounded-2xl p-4 shadow-sm border border-border gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-display font-bold text-foreground">{contract.projectName}</h1>
            <StatusBadge status={contract.status} />
          </div>
          <p className="text-sm text-muted-foreground mt-1">Project #{contract.projectNumber} | Budget: ${Number(contract.budgetAmount).toLocaleString()}</p>
        </div>
        
        <div className="flex items-center gap-2 flex-wrap">
          {user.role === 'contract_manager' && contract.status === 'draft' && (
            <div className="flex items-center gap-2">
              <select 
                className="h-10 px-3 py-2 rounded-md border border-input bg-background text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                value={selectedReviewerId}
                onChange={(e) => setSelectedReviewerId(e.target.value)}
              >
                <option value="">Select Reviewer</option>
                {reviewers.map(r => (
                  <option key={r.id} value={r.id}>{r.fullName}</option>
                ))}
              </select>
              <Button 
                variant="outline" 
                className="hover-elevate bg-background"
                onClick={() => handleStatusChange('in_review')}
                disabled={!selectedReviewerId}
              >
                Submit for Review
              </Button>
            </div>
          )}
          {user.role === 'reviewer' && contract.status === 'in_review' && (
            <Button 
              className="hover-elevate bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => handleStatusChange('approved')}
            >
              Approve Contract
            </Button>
          )}
          {user.role === 'vendor' && contract.status === 'approved' && (
            <Button 
              className="hover-elevate bg-primary hover:bg-primary/90 text-white shadow-lg"
              onClick={() => handleStatusChange('signed')}
            >
              Sign Contract
            </Button>
          )}
        </div>
      </div>

      {/* Main Split View */}
      <div className="flex-1 flex flex-col md:flex-row gap-4 min-h-0">
        
        {/* Editor Pane */}
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
            <Button 
              size="sm" 
              variant="outline" 
              onClick={handleSave} 
              disabled={isSaving || localContent === contract.documentContent}
              className="hover-elevate"
            >
              {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Save
            </Button>
          </div>
          <div className="flex-1 p-0 relative overflow-hidden">
            {user.role === 'vendor' ? (
              <div 
                className="w-full h-full p-6 overflow-auto font-serif leading-relaxed bg-background"
                dangerouslySetInnerHTML={{ __html: localContent }}
              />
            ) : (
              <Editor
                apiKey='no-api-key-needed'
                value={localContent}
                onEditorChange={(content) => setLocalContent(content)}
                init={{
                  height: '100%',
                  menubar: true,
                  plugins: [
                    'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
                    'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
                    'insertdatetime', 'media', 'table', 'code', 'help', 'wordcount'
                  ],
                  toolbar: 'undo redo | blocks | ' +
                    'bold italic forecolor | alignleft aligncenter ' +
                    'alignright alignjustify | bullist numlist outdent indent | ' +
                    'removeformat | table | help',
                  content_style: 'body { font-family: serif; font-size: 16px; line-height: 1.6; padding: 1rem; }',
                  branding: false,
                  promotion: false
                }}
              />
            )}
          </div>
        </Card>

        {/* AI & Context Pane */}
        <Card className="w-full md:w-[400px] flex flex-col shadow-sm border-border overflow-hidden bg-muted/10">
          <Tabs defaultValue="analysis" className="flex-1 flex flex-col">
            <div className="border-b border-border p-2 shrink-0 bg-card">
              <TabsList className="w-full grid grid-cols-3 bg-muted/50 h-auto p-1">
                <TabsTrigger value="analysis" className="py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">Analysis</TabsTrigger>
                <TabsTrigger value="checklist" className="py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">Checklist</TabsTrigger>
                <TabsTrigger value="history" className="py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">History</TabsTrigger>
              </TabsList>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4">
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
                        <StatusBadge status={aiData.scopeScore > 80 ? "approved" : "in_review"} />
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

              <TabsContent value="checklist" className="m-0 space-y-4">
                <h3 className="font-display font-semibold mb-4">Review Checklist</h3>
                {!checklist ? (
                  <div className="text-center p-8 border border-dashed border-border rounded-xl bg-card text-muted-foreground">
                    <CheckSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Checklist will be generated during analysis.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {checklist.map((item, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 bg-card rounded-lg border border-border shadow-sm">
                        <div className={`mt-0.5 w-5 h-5 rounded-md flex items-center justify-center border ${item.done ? 'bg-primary border-primary' : 'border-input bg-background'}`}>
                          {item.done && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <div className="flex-1">
                          <p className={`text-sm font-medium ${item.done ? 'text-muted-foreground line-through' : 'text-foreground'}`}>{item.task}</p>
                          {item.assignee && <p className="text-xs text-muted-foreground mt-1">Assigned: {item.assignee}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="history" className="m-0">
                <h3 className="font-display font-semibold mb-4">Audit Trail</h3>
                <div className="relative pl-3 border-l-2 border-muted space-y-6">
                  {auditLogs?.map((log) => (
                    <div key={log.id} className="relative">
                      <div className="absolute -left-[1.06rem] w-3 h-3 bg-background border-2 border-primary rounded-full mt-1.5" />
                      <div className="pl-3">
                        <p className="text-sm font-medium capitalize">{log.action.replace('_', ' ')}</p>
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
