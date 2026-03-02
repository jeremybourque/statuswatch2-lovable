import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Activity, Plus, ArrowRight, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
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

function useCreateStatusPage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (page: { name: string; slug: string; description?: string }) => {
      const { data, error } = await supabase.from('status_pages').insert(page).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['status-pages'] }),
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
  const createPage = useCreateStatusPage();
  const deletePage = useDeleteStatusPage();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');

  const handleCreate = async () => {
    if (!name.trim() || !slug.trim()) {
      toast.error('Name and slug are required');
      return;
    }
    try {
      await createPage.mutateAsync({ name: name.trim(), slug: slug.trim(), description: description.trim() || undefined });
      toast.success('Status page created');
      setOpen(false);
      setName('');
      setSlug('');
      setDescription('');
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deletePage.mutateAsync(id);
      toast.success('Status page deleted');
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const autoSlug = (value: string) => {
    setName(value);
    setSlug(value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
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
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                New Status Page
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Status Page</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Name</label>
                  <Input placeholder="My Service" value={name} onChange={e => autoSlug(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Slug</label>
                  <Input placeholder="my-service" value={slug} onChange={e => setSlug(e.target.value)} />
                  <p className="text-xs text-muted-foreground">URL: /status/{slug || '...'}</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Description</label>
                  <Textarea placeholder="Optional description" value={description} onChange={e => setDescription(e.target.value)} rows={2} />
                </div>
                <Button onClick={handleCreate} disabled={createPage.isPending} className="w-full">
                  {createPage.isPending ? 'Creating...' : 'Create'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
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
                    <div className="flex items-center gap-2 shrink-0">
                     {page.slug !== 'default' && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={e => { e.preventDefault(); e.stopPropagation(); }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent onClick={e => e.preventDefault()}>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete "{page.name}"?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete this status page and cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(page.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                      )}
                      <ArrowRight className="h-4 w-4 -ml-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
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
