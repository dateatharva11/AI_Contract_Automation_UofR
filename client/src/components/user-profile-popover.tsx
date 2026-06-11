import { Link } from "wouter";
import { format } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import type { AuthUser } from "@/hooks/use-auth";

function formatTimestamp(value: string | null | undefined, fallback = "Never") {
  if (!value) return fallback;
  return format(new Date(value), "MMM d, yyyy 'at' h:mm a");
}

function roleLabel(role: AuthUser["role"]) {
  if (role === "contract_manager") return "Contract Administrator";
  if (role === "reviewer") return "Reviewer";
  return "Vendor";
}

export function UserProfilePopover({ user, children }: { user: AuthUser; children: React.ReactNode }) {
  return (
    <Popover>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent side="top" align="start" className="w-72">
        <div className="space-y-3">
          <div>
            <p className="font-semibold">{user.fullName}</p>
            <p className="text-xs text-muted-foreground">{user.email}</p>
          </div>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Role</dt>
              <dd className="font-medium text-right">{roleLabel(user.role)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Member since</dt>
              <dd className="font-medium text-right">
                {user.createdAt ? format(new Date(user.createdAt), "MMM d, yyyy") : "—"}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Last login</dt>
              <dd className="font-medium text-right">{formatTimestamp(user.lastLoginAt)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Last active</dt>
              <dd className="font-medium text-right">{formatTimestamp(user.lastActiveAt)}</dd>
            </div>
          </dl>
          <Button variant="outline" size="sm" className="w-full" asChild>
            <Link href="/activity">View all activity</Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}