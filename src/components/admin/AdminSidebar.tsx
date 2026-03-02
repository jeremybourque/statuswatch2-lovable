import { Server, AlertTriangle, Settings, ArrowLeft, BarChart3, FlaskConical } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useLocation, useParams } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';

export function AdminSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const location = useLocation();
  const { slug } = useParams<{ slug: string }>();
  const base = `/${slug}/admin`;

  const items = [
    { title: 'Incidents', url: `${base}/incidents`, icon: AlertTriangle },
    { title: 'Services', url: `${base}/services`, icon: Server },
    { title: 'Analytics', url: `${base}/analytics`, icon: BarChart3 },
    { title: 'Settings', url: `${base}/settings`, icon: Settings },
    { title: 'Testing', url: `${base}/testing`, icon: FlaskConical },
  ];

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Admin</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map(item => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      className="hover:bg-muted/50"
                      activeClassName="bg-muted text-primary font-medium"
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              <SidebarMenuItem className="mt-4">
                <SidebarMenuButton asChild>
                  <NavLink to={`/${slug}`} className="hover:bg-muted/50" activeClassName="">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    {!collapsed && <span>Back</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
