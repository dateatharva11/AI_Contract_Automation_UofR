import React, { useState, useRef } from "react";
import { Paperclip, Upload, FileText, X, Loader2, CheckCircle, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface ExhibitAttachmentProps {
  contractId: number;
  exhibitName: string;
  isAttached: boolean;
  fileUrl?: string | null;
  fileName?: string | null;
  isDisabled?: boolean;  // Add this prop
  onAttached: (exhibitName: string, fileUrl: string, fileName: string) => void;
  onDetached: (exhibitName: string) => void;
}

export function ExhibitAttachment({ 
  contractId, 
  exhibitName, 
  isAttached, 
  fileUrl,
  fileName,
  isDisabled = false,  // Default to false
  onAttached, 
  onDetached 
}: ExhibitAttachmentProps) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isDisabled) {
      toast({
        title: "Cannot Modify",
        description: "Exhibits cannot be modified after contract submission.",
        variant: "destructive",
      });
      return;
    }

    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validate file type
    if (selectedFile.type !== 'application/pdf') {
      toast({
        title: "Invalid File Type",
        description: "Please upload a PDF file",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 50MB)
    if (selectedFile.size > 50 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Maximum file size is 50MB",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('exhibit', selectedFile);
      formData.append('exhibitName', exhibitName);

      const response = await fetch(`/api/contracts/${contractId}/attach-exhibit`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to upload exhibit');
      }

      const data = await response.json();
      onAttached(exhibitName, data.fileUrl, selectedFile.name);
      
      toast({
        title: "Exhibit Attached",
        description: `${exhibitName} has been uploaded successfully`,
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Failed to upload exhibit",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemove = async () => {
    if (isDisabled) {
      toast({
        title: "Cannot Modify",
        description: "Exhibits cannot be modified after contract submission.",
        variant: "destructive",
      });
      return;
    }

    if (!confirm(`Are you sure you want to remove ${exhibitName}?`)) return;

    setUploading(true);
    try {
      const response = await fetch(`/api/contracts/${contractId}/detach-exhibit`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exhibitName }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to remove exhibit');
      }

      onDetached(exhibitName);
      
      toast({
        title: "Exhibit Removed",
        description: `${exhibitName} has been removed`,
      });
    } catch (error) {
      console.error('Remove error:', error);
      toast({
        title: "Remove Failed",
        description: error instanceof Error ? error.message : "Failed to remove exhibit",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  // If disabled, show read-only view
  if (isDisabled) {
    return (
      <div className="mt-2 ml-7">
        {isAttached && fileUrl ? (
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground truncate max-w-[150px]">
              {fileName || 'Attached'}
            </span>
            {/* <Button
              variant="ghost"
              size="sm"
              onClick={handleView}
              className="h-6 px-2 text-primary hover:text-primary"
              title="View exhibit"
            >
              <Eye className="w-3 h-3" />
            </Button> */}
            <CheckCircle className="w-3 h-3 text-emerald-500" />
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground italic">No exhibit attached</span>
          </div>
        )}
      </div>
    );
  }

  // Active/editable view
  return (
    <div className="mt-2 ml-7">
      {!isAttached ? (
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            onChange={handleFileSelect}
            className="hidden"
            disabled={isDisabled}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || isDisabled}
            className="h-8 text-xs"
          >
            {uploading ? (
              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            ) : (
              <Paperclip className="w-3 h-3 mr-1" />
            )}
            Attach PDF
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-primary" />
          <span className="text-xs text-muted-foreground truncate max-w-[150px]">
            {fileName || 'Attached'}
          </span>
          {/* <Button
            variant="ghost"
            size="sm"
            onClick={handleView}
            className="h-6 px-2 text-primary hover:text-primary"
            title="View exhibit"
          >
            <Eye className="w-3 h-3" />
          </Button> */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRemove}
            disabled={uploading}
            className="h-6 px-2 text-destructive hover:text-destructive"
          >
            <X className="w-3 h-3" />
          </Button>
          {uploading && <Loader2 className="w-3 h-3 animate-spin" />}
          <CheckCircle className="w-3 h-3 text-emerald-500" />
        </div>
      )}
    </div>
  );
}