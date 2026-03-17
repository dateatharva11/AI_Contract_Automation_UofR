import { useState } from "react";
import { User } from "@shared/schema";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ChevronDown, Check, Users } from "lucide-react";

interface ReviewerSelectorProps {
  reviewers: User[];
  selectedReviewerId: string;
  onSelect: (id: string) => void;
  disabled?: boolean;
}

export function ReviewerSelector({ reviewers, selectedReviewerId, onSelect, disabled }: ReviewerSelectorProps) {
  const [open, setOpen] = useState(false);
  const selectedReviewer = reviewers.find(r => r.id.toString() === selectedReviewerId);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="hover-elevate bg-background flex items-center gap-2 min-w-[200px]"
          disabled={disabled || reviewers.length === 0}
        >
          <Users className="w-4 h-4" />
          <span className="flex-1 text-left">
            {selectedReviewer ? selectedReviewer.fullName : "Select Reviewer"}
          </span>
          <ChevronDown className="w-4 h-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3" align="start">
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground px-2 py-1">Choose a reviewer</p>
          {reviewers.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No reviewers available</p>
          ) : (
            <div className="space-y-1 max-h-[300px] overflow-y-auto">
              {reviewers.map((reviewer) => (
                <button
                  key={reviewer.id}
                  onClick={() => {
                    onSelect(reviewer.id.toString());
                    setOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg border transition-all text-left ${
                    selectedReviewerId === reviewer.id.toString()
                      ? 'bg-primary/10 border-primary text-primary'
                      : 'border-transparent hover:bg-muted hover:border-border'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{reviewer.fullName}</p>
                    <p className="text-xs text-muted-foreground truncate">{reviewer.email}</p>
                  </div>
                  {selectedReviewerId === reviewer.id.toString() && (
                    <Check className="w-4 h-4 flex-shrink-0 text-primary" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
