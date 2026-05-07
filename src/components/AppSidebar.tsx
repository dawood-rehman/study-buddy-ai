"use client";

import {
  BookOpen, Brain, FileText, Home, Languages,
  LayoutDashboard, Library, MessageSquare, Pencil, ScrollText,
  Settings, Sparkles, BookMarked, Bot, ShieldCheck, MessageSquarePlus, Globe2, CreditCard, X
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
  { title: "AI Earth Map", url: "/world", icon: Globe2 },
  { title: "Saved Library", url: "/library", icon: Library },
];

function NavGroup({ label, items, collapsed, onNavigate }: { label: string; items: typeof mainItems; collapsed: boolean; onNavigate?: () => void }) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton asChild>
                <NavLink
                  to={item.url}
                  end={item.url === "/"}
                  className="hover:bg-sidebar-accent/50"
                  activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                  onClick={onNavigate}
                >
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
  const { state, isMobile, setOpenMobile } = useSidebar();
  const { user } = useAuth();
  const collapsed = !isMobile && state === "collapsed";
  const closeMobileSidebar = () => {
    if (isMobile) setOpenMobile(false);
  };
  const accountItems = [
    { title: "Feedback", url: "/feedback", icon: MessageSquarePlus },
    { title: "Settings", url: "/settings", icon: Settings },
    ...(user && user.role !== "admin" ? [{ title: "Upgrade", url: "/upgrade", icon: CreditCard }] : []),
    ...(user?.role === "admin" ? [{ title: "Admin", url: "/admin", icon: ShieldCheck }] : []),
  ];

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <div className="flex items-center gap-2 p-4">
          <div className="h-8 w-8 rounded-lg gradient-primary flex items-center justify-center flex-shrink-0">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </div>
          {!collapsed && (
            <span className="font-display font-bold text-sidebar-foreground text-lg">StudyAI</span>
          )}
          {isMobile ? (
            <button
              type="button"
              className="ml-auto rounded-md p-2 text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              onClick={closeMobileSidebar}
              aria-label="Close menu"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
        <NavGroup label="Menu" items={mainItems} collapsed={collapsed} onNavigate={closeMobileSidebar} />
        <NavGroup label="Study Tools" items={studyItems} collapsed={collapsed} onNavigate={closeMobileSidebar} />
        <NavGroup label="More" items={moreItems} collapsed={collapsed} onNavigate={closeMobileSidebar} />
        <SidebarGroup>
          <SidebarGroupLabel>Account</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {accountItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      className="hover:bg-sidebar-accent/50"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                      onClick={closeMobileSidebar}
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
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
