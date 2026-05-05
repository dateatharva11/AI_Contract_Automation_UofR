import { CheckCircle, Circle } from 'lucide-react';

interface ContractProgressBarProps {
  status: string;
}

const STAGES = [
  { key: 'draft', label: 'Draft' },
  { key: 'review', label: 'Review' },
  { key: 'approved', label: 'Approved' },
  { key: 'signed', label: 'Signed' },
];

export function ContractProgressBar({ status }: ContractProgressBarProps) {
  const currentStageIndex = STAGES.findIndex(s => s.key === status);

  return (
    <div className="w-full bg-card border-b border-border px-4 py-6">
      <div className="flex items-center justify-between relative">
        {/* Progress line background */}
        <div className="absolute top-5 left-0 right-0 h-1 bg-muted rounded-full" />
        
        {/* Progress line filled */}
        <div 
          className="absolute top-5 left-0 h-1 bg-primary rounded-full transition-all duration-300"
          style={{ width: currentStageIndex === -1 ? '0%' : `${(currentStageIndex / (STAGES.length - 1)) * 100}%` }}
        />

        {/* Stage circles */}
        <div className="flex justify-between w-full relative z-10">
          {STAGES.map((stage, index) => {
            const isCompleted = index < currentStageIndex;
            const isCurrent = index === currentStageIndex;

            return (
              <div key={stage.key} className="flex flex-col items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                    isCompleted || isCurrent
                      ? 'bg-primary shadow-lg'
                      : 'bg-muted border-2 border-muted-foreground/20'
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle className="w-5 h-5 text-white" />
                  ) : (
                    <Circle className={`w-5 h-5 ${isCurrent ? 'text-white' : 'text-muted-foreground'}`} />
                  )}
                </div>
                <label className={`text-xs mt-2 font-medium ${
                  isCurrent
                    ? 'text-foreground'
                    : isCompleted
                    ? 'text-primary'
                    : 'text-muted-foreground'
                }`}>
                  {stage.label}
                </label>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}