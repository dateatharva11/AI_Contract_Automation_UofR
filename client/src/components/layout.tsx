import React from "react";
import { useLocation, Link } from "wouter";
import { 
  FileText, 
  LayoutDashboard, 
  Building2, 
  Settings, 
  LogOut,
  GraduationCap
} from "lucide-react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth, Role } from "@/hooks/use-auth";

const navItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Contracts", url: "/contracts", icon: FileText },
  { title: "Vendors", url: "/vendors", icon: Building2 },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { user } = useAuth();

  return (
    <Sidebar variant="inset">
      <SidebarHeader className="p-4 flex items-center gap-3 border-b border-sidebar-border">
        <div className="bg-white text-primary p-2 rounded-lg shadow-sm">
          <GraduationCap className="w-6 h-6" />
        </div>
        <div className="flex flex-col">
          <span className="font-display font-bold text-lg leading-tight tracking-tight">University</span>
          <span className="text-xs text-sidebar-primary/70 font-medium tracking-wide uppercase">Contract Portal</span>
        </div>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-primary/60 mt-4">Main Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={location === item.url || (item.url !== "/" && location.startsWith(item.url))}
                    className="hover-elevate my-1 font-medium"
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
            <span className="text-xs text-sidebar-primary/70 capitalize tracking-wide">{user.role}</span>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, setRole } = useAuth();
  
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
              {/* Mock Auth Switcher for Demo */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground font-medium hidden sm:block">Viewing as:</span>
                <Select value={user.role} onValueChange={(v) => setRole(v as Role)}>
                  <SelectTrigger className="w-[140px] h-9">
                    <SelectValue placeholder="Select Role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Administrator</SelectItem>
                    <SelectItem value="reviewer">Reviewer</SelectItem>
                    <SelectItem value="vendor">Vendor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
