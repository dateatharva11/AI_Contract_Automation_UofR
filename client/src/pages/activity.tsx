import { useAuth } from "@/hooks/use-auth";
import { useUserActivity } from "@/hooks/use-user-activity";
import { UserActivityFeed } from "@/components/user-activity-feed";
import { AdminActivityPanel } from "@/components/admin-activity-panel";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ActivityPage() {
  const { user } = useAuth();
  
  // Admin view
  if (user?.role === "contract_manager") {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div>
          <h1 className="text-3xl font-display font-bold">Activity Log</h1>
          <p className="text-muted-foreground mt-1">
            All user actions across contracts
          </p>
        </div>
        <AdminActivityPanel />
      </div>
    );
  }

  // Non-admin view
  const { data, isLoading } = useUserActivity();
  
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-display font-bold">My Activity</h1>
        <p className="text-muted-foreground mt-1">
          A history of contract actions you've performed across the portal.
        </p>
      </div>
      
      {/* Activity Feed */}
      <Card className="glass-panel">
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2">
            Recent Actions
            <span className="text-sm font-normal text-muted-foreground">
              ({data?.length || 0} events)
            </span>
          </CardTitle>
          <CardDescription>
            Your contract activities and updates
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UserActivityFeed 
            items={data} 
            isLoading={isLoading}
            emptyMessage="You haven't performed any contract actions yet."
          />
        </CardContent>
      </Card>
    </div>
  );
}