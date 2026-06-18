import React, { useState, useEffect } from "react";
import { CheckSquare, Check, Loader2, RefreshCw, AlertCircle, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ExhibitAttachment } from "./exhibit-attachment";

interface ChecklistItem {
  task: string;
  done: boolean;
  assignee?: string;
  file_url?: string | null;
  file_name?: string | null;
  uploaded_at?: string | null;
}

interface ReviewChecklistProps {
  contractId: number;
  contractStatus?: string;
  onChecklistUpdate?: (checklist: ChecklistItem[]) => void;
}

export function ReviewChecklist({ contractId, contractStatus = 'draft', onChecklistUpdate }: ReviewChecklistProps) {
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<number | null>(null);
  const { toast } = useToast();

  const isEditable = contractStatus === 'draft';

  useEffect(() => {
    fetchChecklist();
  }, [contractId]);

  const fetchChecklist = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/contracts/${contractId}/checklist`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      setChecklist(data.checklist || []);
      onChecklistUpdate?.(data.checklist || []);
    } catch (error) {
      console.error('Error fetching checklist:', error);
      setError('Failed to load review checklist');
      toast({
        title: "Error",
        description: "Failed to load review checklist. Please refresh the page.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateChecklistItem = async (index: number, done: boolean, fileUrl?: string | null, fileName?: string | null) => {
    if (!isEditable) {
      toast({
        title: "Cannot Modify",
        description: "Checklist cannot be modified after contract submission.",
        variant: "destructive",
      });
      return;
    }

    setUpdating(index);
    try {
      const response = await fetch(`/api/contracts/${contractId}/checklist`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskIndex: index, done, fileUrl, fileName }),
      });
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const data = await response.json();
      setChecklist(data.checklist || []);
      onChecklistUpdate?.(data.checklist || []);
    } catch (error) {
      console.error('Error updating checklist:', error);
      toast({
        title: "Error",
        description: "Failed to update checklist item.",
        variant: "destructive",
      });
    } finally {
      setUpdating(null);
    }
  };

  const handleExhibitAttached = (exhibitName: string, fileUrl: string, fileName: string) => {
    const index = checklist.findIndex(item => item.task === exhibitName);
    if (index !== -1) {
      updateChecklistItem(index, true, fileUrl, fileName);
    }
  };

  const handleExhibitDetached = (exhibitName: string) => {
    const index = checklist.findIndex(item => item.task === exhibitName);
    if (index !== -1) {
      updateChecklistItem(index, false, null, null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-8 border border-dashed border-destructive/50 rounded-xl bg-destructive/5">
        <AlertCircle className="w-8 h-8 mx-auto mb-2 text-destructive opacity-50" />
        <p className="text-sm text-destructive">{error}</p>
        <Button variant="outline" size="sm" className="mt-4" onClick={fetchChecklist}>
          <RefreshCw className="w-3 h-3 mr-1" />
          Retry
        </Button>
      </div>
    );
  }

  const completedCount = checklist.filter(item => item.done).length;
  const totalCount = checklist.length;
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  if (checklist.length === 0) {
    return (
      <div className="text-center p-8 border border-dashed border-border rounded-xl bg-card text-muted-foreground">
        <CheckSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No exhibits required for this contract.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="font-display font-semibold">Required Exhibits</h3>
          <p className="text-xs text-muted-foreground">
            {completedCount} of {totalCount} exhibits attached
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={fetchChecklist} disabled={loading}>
          <RefreshCw className="w-3 h-3 mr-1" />
          Refresh
        </Button>
      </div>

      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div 
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {!isEditable && (
        <div className="p-2 bg-muted/50 rounded-lg text-center">
          <Lock className="w-3 h-3 inline mr-1" />
          <span className="text-xs text-muted-foreground">Checklist is locked - contract has been submitted for review</span>
        </div>
      )}

      <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
        {checklist.map((item, index) => (
          <Card 
            key={index}
            className={`p-3 transition-all duration-200 ${
              item.done 
                ? 'bg-primary/5 border-primary/20' 
                : 'bg-card border-border'
            }`}
          >
            <div className="flex items-start gap-3">
              <Checkbox
                id={`check-${index}`}
                checked={item.done}
                onCheckedChange={(checked) => {
                  if (!isEditable) return;
                  if (checked === true && !item.done) {
                    updateChecklistItem(index, true, item.file_url, item.file_name);
                  } else if (checked === false) {
                    updateChecklistItem(index, false, null, null);
                  }
                }}
                disabled={!isEditable || updating === index}
              />
              <div className="flex-1">
                <label
                  htmlFor={`check-${index}`}
                  className={`text-sm font-medium cursor-pointer ${
                    !isEditable ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'
                  } ${
                    item.done 
                      ? 'text-muted-foreground line-through' 
                      : 'text-foreground'
                  }`}
                >
                  {item.task}
                </label>
                <ExhibitAttachment
                    contractId={contractId}
                    exhibitName={item.task}
                    isAttached={item.done}
                    fileUrl={item.file_url}
                    fileName={item.file_name}
                    isDisabled={!isEditable}
                    onAttached={handleExhibitAttached}
                    onDetached={handleExhibitDetached}
                />
              </div>
              {updating === index && (
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              )}
            </div>
          </Card>
        ))}
      </div>

      {completedCount === totalCount && totalCount > 0 && (
        <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-center">
          <Check className="w-4 h-4 text-emerald-500 inline mr-2" />
          <span className="text-sm text-emerald-500 font-medium">
            All exhibits have been attached to the contract!
          </span>
        </div>
      )}
    </div>
  );
}