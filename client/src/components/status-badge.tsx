import { Badge } from "@/components/ui/badge";

export function StatusBadge({ status }: { status: string }) {
  switch (status.toLowerCase()) {
    case 'draft':
      return <Badge variant="secondary" className="bg-slate-100 text-slate-700 hover:bg-slate-200">Draft</Badge>;
    case 'in_review':
      return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-200 border-transparent">In Review</Badge>;
    case 'approved':
      return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border-transparent">Approved</Badge>;
    case 'signed':
      return <Badge className="bg-primary/10 text-primary hover:bg-primary/20 border-transparent">Signed</Badge>;
    default:
      return <Badge variant="outline" className="capitalize">{status.replace('_', ' ')}</Badge>;
  }
}
