"use client";

import {
  BookOpen, Brain, FileText, Home, Languages,
  LayoutDashboard, Library, MessageSquare, Pencil, ScrollText,
  Settings, Sparkles, BookMarked, Bot, LogIn, ShieldCheck, MessageSquarePlus, LogOut
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/lib/auth-context";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const mainItems = [
  { title: "Home", url: "/", icon: Home },
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
];

const studyItems = [
  { title: "Study Helper", url: "/study", icon: BookOpen },
  { title: "General AI", url: "/ai", icon: Bot },
  { title: "Quiz Generator", url: "/quiz", icon: Brain },
  { title: "Summaries", url: "/summary", icon: ScrollText },
  { title: "Past Papers", url: "/past-papers", icon: FileText },
  { title: "Grammar Coach", url: "/grammar", icon: Languages },
];

const moreItems = [
  { title: "Counseling", url: "/counseling", icon: MessageSquare },
  { title: "Resume Builder", url: "/resume", icon: Pencil },
  { title: "Books", url: "/books", icon: BookMarked },
  { title: "Saved Library", url: "/library", icon: Library },
  { title: "Feedback", url: "/feedback", icon: MessageSquarePlus },
  { title: "Settings", url: "/settings", icon: Settings },
];

function NavGroup({ label, items, collapsed }: { label: string; items: typeof mainItems; collapsed: boolean }) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton asChild>
                <NavLink to={item.url} end={item.url === "/"} className="hover:bg-sidebar-accent/50" activeClassName="bg-sidebar-accent text-sidebar-primary font-medium">
                  <item.icon className="mr-2 h-4 w-4" />
                  {!collapsed && <span>{item.title}</span>}
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

export function AppSidebar() {
  const { state } = useSidebar();
  const { user, signOut } = useAuth();
  const collapsed = state === "collapsed";
  const accountItems = [
    ...(user?.role === "admin" ? [{ title: "Admin", url: "/admin", icon: ShieldCheck }] : []),
    { title: user ? "Logout" : "Login", url: "/login", icon: user ? LogOut : LogIn },
  ];

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <div className="p-4 flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg gradient-primary flex items-center justify-center flex-shrink-0">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </div>
          {!collapsed && (
            <span className="font-display font-bold text-sidebar-foreground text-lg">StudyAI</span>
          )}
        </div>
        <NavGroup label="Menu" items={mainItems} collapsed={collapsed} />
        <NavGroup label="Study Tools" items={studyItems} collapsed={collapsed} />
        <NavGroup label="More" items={moreItems} collapsed={collapsed} />
        <SidebarGroup>
          <SidebarGroupLabel>Account</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {accountItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    {item.title === "Logout" ? (
                      <button type="button" className="w-full hover:bg-sidebar-accent/50" onClick={() => void signOut()}>
                        <item.icon className="mr-2 h-4 w-4" />
                        {!collapsed && <span>{item.title}</span>}
                      </button>
                    ) : (
                      <NavLink to={item.url} className="hover:bg-sidebar-accent/50" activeClassName="bg-sidebar-accent text-sidebar-primary font-medium">
                        <item.icon className="mr-2 h-4 w-4" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
