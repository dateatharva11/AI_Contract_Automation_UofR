import React from "react";
import { useLocation, Link } from "wouter";
import { Bell, FileText, LayoutDashboard, Building2, Settings, LogOut, GraduationCap, CheckCircle2, ShieldAlert, ChevronDown } from "lucide-react";
import { useNotifications, useMarkNotificationRead } from "@/hooks/use-notifications";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  SidebarHeader,
  SidebarFooter
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth, AuthUser, Role } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { User } from "@shared/schema";


const navItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Contracts", url: "/contracts", icon: FileText },
  { title: "Vendors", url: "/vendors", icon: Building2 },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { user } = useAuth();

  return (
    <Sidebar variant="inset" className="border-r border-sidebar-border">
      <SidebarHeader className="p-4 flex items-center gap-3 border-b border-sidebar-border">
        <div className="bg-primary text-primary-foreground p-2 rounded-lg shadow-sm">
          <GraduationCap className="w-6 h-6" />
        </div>
        <div className="flex flex-col text-sidebar-foreground">
          <span className="font-display font-bold text-lg leading-tight tracking-tight">University</span>
          <span className="text-xs text-muted-foreground font-medium tracking-wide uppercase">Contract Portal</span>
        </div>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-muted-foreground font-semibold mt-4">Main Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={location === item.url || (item.url !== "/" && location.startsWith(item.url))}
                    className="hover-elevate my-1 font-medium transition-colors data-[active=true]:bg-primary data-[active=true]:text-primary-foreground"
                  >
                    <Link href={item.url}>
                      <item.icon className="w-5 h-5" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-sidebar-border bg-sidebar-accent/30">
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9 bg-primary-foreground text-primary font-bold shadow-sm">
            <AvatarFallback>{user.fullName.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col overflow-hidden">
            <span className="text-sm font-semibold truncate">{user.fullName}</span>
            <span className="text-xs text-sidebar-primary/70 capitalize tracking-wide">
              {user.role === "contract_manager" ? "Contract Manager" : user.role}
            </span>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

function NotificationBell() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { data: notifications } = useNotifications();
  const { mutate: markRead } = useMarkNotificationRead();
  const unreadCount = notifications?.filter(n => !n.read).length || 0;

  const handleNotificationClick = (notification: any) => {
    if (!notification.read) {
      markRead(notification.id);
    }
    setLocation(`/contracts/${notification.contractId}`);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative hover:bg-muted rounded-full">
          <Bell className="h-5 w-5 text-muted-foreground" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-accent text-white border-2 border-card rounded-full text-[10px] font-bold">
              {unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 shadow-xl border-border rounded-xl" align="end">
        <div className="p-4 border-b border-border bg-muted/30">
          <h3 className="font-display font-bold">Notifications</h3>
        </div>
        <ScrollArea className="h-80">
          {notifications?.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <p className="text-sm">No notifications yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications?.map((n) => (
                <div 
                  key={n.id} 
                  className={`p-4 transition-colors hover:bg-muted/50 cursor-pointer ${!n.read ? 'bg-primary/5' : ''}`}
                  onClick={() => handleNotificationClick(n)}
                >
                  <div className="flex gap-3">
                    <div className={`mt-0.5 h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
                      n.type === 'approval_request' ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'
                    }`}>
                      {n.type === 'approval_request' ? <ShieldAlert className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className={`text-sm leading-snug ${!n.read ? 'font-semibold' : 'text-muted-foreground'}`}>
                        {n.message}
                      </p>
                      <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                        {format(new Date(n.createdAt!), 'MMM d, h:mm a')}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
        <div className="p-3 border-t border-border text-center bg-muted/10">
          <Button variant="ghost" size="sm" className="text-xs font-semibold text-primary">View All</Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

const ROLE_LABELS: Record<string, string> = {
  contract_manager: "Contract Manager",
  reviewer: "Reviewer",
  vendor: "Vendor",
};

function UserSwitcher() {
  const { user, setUser } = useAuth();
  const [open, setOpen] = React.useState(false);

  const { data: allUsers = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  // Normalize legacy "admin" role to "contract_manager"
  const normalizeRole = (role: string): Role => {
    if (role === "admin") return "contract_manager";
    return role as Role;
  };

  const handleSelect = (apiUser: User) => {
    setUser({
      id: apiUser.id,
      fullName: apiUser.fullName,
      email: apiUser.email,
      role: normalizeRole(apiUser.role),
      username: apiUser.username,
    });
    setOpen(false);
  };

  // Group users by normalized role
  const grouped = allUsers.reduce<Record<string, User[]>>((acc, u) => {
    const role = normalizeRole(u.role);
    if (!acc[role]) acc[role] = [];
    acc[role].push(u);
    return acc;
  }, {});

  const roleOrder = ["contract_manager", "reviewer", "vendor"];

  // Generate a consistent color based on user name
  const getAvatarColor = (name: string) => {
    const colors = [
      "bg-red-500", "bg-blue-500", "bg-green-500", "bg-yellow-500", 
      "bg-purple-500", "bg-pink-500", "bg-indigo-500", "bg-orange-500"
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground font-medium hidden sm:block">Viewing as:</span>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="h-9 px-3 flex items-center gap-2 min-w-[180px] justify-between"
          >
            <div className="flex items-center gap-2 min-w-0">
              <Avatar className={`h-6 w-6 ${getAvatarColor(user.fullName)} text-black shrink-0`}>
                <AvatarFallback className="text-[11px] font-bold">{user.fullName.charAt(0)}</AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium truncate">{user.fullName}</span>
            </div>
            <ChevronDown className="w-4 h-4 opacity-50 shrink-0" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-2" align="end">
          <div className="space-y-3">
            {roleOrder.map((role) => {
              const usersInRole = grouped[role];
              if (!usersInRole || usersInRole.length === 0) return null;
              return (
                <div key={role}>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-2 pb-1">
                    {ROLE_LABELS[role] || role}
                  </p>
                  <div className="space-y-0.5">
                    {usersInRole.map((u) => (
                      <button
                        key={u.id}
                        onClick={() => handleSelect(u)}
                        className={`w-full flex items-center gap-3 px-2 py-2 rounded-lg transition-colors text-left ${
                          user.id === u.id
                            ? "bg-primary/10"
                            : "hover:bg-muted"
                        }`}
                      >
                        <Avatar className={`h-7 w-7 ${getAvatarColor(u.fullName)} text-b shrink-0`}>
                          <AvatarFallback className="text-xs font-bold">{u.fullName.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium truncate ${user.id === u.id ? "text-primary" : "text-foreground"}`}>
                            {u.fullName}
                          </p>
                          <p className="text-[11px] text-muted-foreground truncate">{u.email}</p>
                        </div>
                        {user.id === u.id && (
                          <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  
  return (
    <SidebarProvider>
      <div className="flex h-screen w-full bg-background overflow-hidden">
        <AppSidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="flex h-16 shrink-0 items-center justify-between border-b bg-card px-6 shadow-sm z-10">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
              <h1 className="font-display text-lg font-semibold text-foreground hidden sm:block">
                Contract Management System
              </h1>
            </div>
            
            <div className="flex items-center gap-4">
              <NotificationBell />
              <UserSwitcher />
            </div>
          </header>
          
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
            <div className="mx-auto max-w-7xl h-full">
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
