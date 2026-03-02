import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Activity, Plus, ArrowRight, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useState } from 'react';
import { toast } from 'sonner';
import { format } from 'date-fns';

function useStatusPages() {
  return useQuery({
    queryKey: ['status-pages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('status_pages')
        .select('*')
        .order('created_at');
      if (error) throw error;
      return data;
    },
  });
}


function useDeleteStatusPage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('status_pages').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['status-pages'] }),
  });
}

const Index = () => {
  const { data: pages = [], isLoading } = useStatusPages();
  const deletePage = useDeleteStatusPage();
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deletePage.mutateAsync(deleteTarget.id);
      toast.success('Status page deleted');
      setDeleteTarget(null);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="max-w-3xl mx-auto px-4 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Activity className="h-7 w-7 text-primary" />
            <h1 className="text-xl font-bold text-foreground tracking-tight">StatusWatch</h1>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-foreground">Status Pages</h2>
          <Button size="sm" className="gap-2" asChild>
            <Link to="/create">
              <Plus className="h-4 w-4" />
              New Status Page
            </Link>
          </Button>
        </div>

        {isLoading ? (
          <div className="text-muted-foreground text-sm">Loading...</div>
        ) : pages.length === 0 ? (
          <div className="border border-dashed border-border rounded-lg p-8 text-center space-y-3">
            <Activity className="h-10 w-10 text-muted-foreground mx-auto" />
            <p className="text-muted-foreground">No status pages yet. Create your first one.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pages.map(page => (
              <Link
                key={page.id}
                to={`/${page.slug}`}
                className="group block border border-border rounded-lg bg-card p-4 hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-card-foreground">{page.name}</h3>
                      <span className="text-xs text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded">/{page.slug}</span>
                    </div>
                    {page.description && (
                      <p className="text-sm text-muted-foreground mt-1 truncate">{page.description}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1.5">
                      Created {format(new Date(page.created_at), 'MMM d, yyyy')}
                    </p>
                  </div>
                    <div className="flex items-center gap-2 shrink-0 pr-4">
                     {page.slug !== 'default' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={e => { e.preventDefault(); e.stopPropagation(); setDeleteTarget({ id: page.id, name: page.name }); }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                      <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        <AlertDialog open={!!deleteTarget} onOpenChange={open => { if (!open) setDeleteTarget(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete "{deleteTarget?.name}"?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete this status page and all its data. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>

      <footer className="border-t border-border mt-16">
        <div className="max-w-3xl mx-auto px-4 py-6 flex items-center justify-between text-sm text-muted-foreground">
          <span>© 2026 StatusWatch</span>
        </div>
      </footer>
    </div>
  );
};

export default Index;
