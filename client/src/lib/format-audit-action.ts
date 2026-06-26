const ACTION_LABELS: Record<string, string> = {
    created: "Created contract",
    edited: "Edited contract",
    updated: "Updated contract",
    "returned to admin": "Returned to admin",
    "returned to reviewer": "Returned to reviewer",
    draft_generated: "Generated AI draft",
    analyzed: "Ran AI analysis",
  };
  
  export function formatAuditAction(action: string): string {
    if (ACTION_LABELS[action]) return ACTION_LABELS[action];
    return action.replace(/_/g, " ").replace(/^\w/, c => c.toUpperCase());
  }