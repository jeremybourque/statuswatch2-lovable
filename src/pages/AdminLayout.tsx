import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { Outlet } from 'react-router-dom';
import { useStatusPage } from '@/hooks/use-status-page';

export default function AdminLayout() {
  const { statusPageId, data: statusPage, isLoading } = useStatusPage();

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading...</div>;
  }

  if (!statusPage) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Status page not found</div>;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AdminSidebar />
        <div className="flex-1 flex flex-col">
          <header className="h-12 flex items-center border-b border-border px-4">
            <SidebarTrigger />
            <span className="ml-3 text-sm font-medium text-muted-foreground">{statusPage.name} — Admin</span>
          </header>
          <main className="flex-1 p-6">
            <Outlet context={{ statusPageId: statusPageId! }} />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
