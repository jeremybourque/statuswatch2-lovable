import { useState } from 'react';
import { Activity, ArrowLeft, Plus, X, GripVertical } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ServiceEntry {
  id: string;
  name: string;
  description: string;
  category: string;
}

const CreateStatusPage = () => {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [services, setServices] = useState<ServiceEntry[]>([]);
  const [saving, setSaving] = useState(false);

  const autoSlug = (value: string) => {
    setName(value);
    setSlug(value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
  };

  const addService = () => {
    setServices(prev => [
      ...prev,
      { id: crypto.randomUUID(), name: '', description: '', category: 'General' },
    ]);
  };

  const updateService = (id: string, field: keyof ServiceEntry, value: string) => {
    setServices(prev => prev.map(s => (s.id === id ? { ...s, [field]: value } : s)));
  };

  const removeService = (id: string) => {
    setServices(prev => prev.filter(s => s.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !slug.trim()) {
      toast.error('Name and slug are required');
      return;
    }
    const validServices = services.filter(s => s.name.trim());
    if (validServices.length === 0) {
      toast.error('Add at least one service');
      return;
    }

    setSaving(true);
    try {
      const { data: page, error: pageErr } = await supabase
        .from('status_pages')
        .insert({ name: name.trim(), slug: slug.trim(), description: description.trim() || null })
        .select()
        .single();
      if (pageErr) throw pageErr;

      const rows = validServices.map((s, i) => ({
        status_page_id: page.id,
        name: s.name.trim(),
        description: s.description.trim() || null,
        category: s.category.trim() || 'General',
        display_order: i,
      }));
      const { error: svcErr } = await supabase.from('services').insert(rows);
      if (svcErr) throw svcErr;

      toast.success('Status page created');
      navigate(`/${page.slug}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to create status page');
    } finally {
      setSaving(false);
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

      <main className="max-w-3xl mx-auto px-4 py-8">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6">
          <ArrowLeft className="h-4 w-4" />
          Back to Status Pages
        </Link>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div>
            <h2 className="text-xl font-semibold text-foreground mb-4">Create Status Page</h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Page Name</Label>
                <Input id="name" placeholder="My App Status" value={name} onChange={e => autoSlug(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Slug</Label>
                <Input id="slug" placeholder="my-app-status" value={slug} onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} />
                <p className="text-xs text-muted-foreground">This will be the URL path: /{slug || '...'}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea id="description" placeholder="A brief description of what this status page monitors" value={description} onChange={e => setDescription(e.target.value)} rows={2} />
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">Services</h3>
              <Button type="button" variant="outline" size="sm" onClick={addService}>
                <Plus className="h-4 w-4 mr-1" /> Add Service
              </Button>
            </div>

            {services.length === 0 ? (
              <div className="border border-dashed border-border rounded-lg p-8 text-center">
                <p className="text-muted-foreground text-sm mb-3">No services added yet</p>
                <Button type="button" variant="secondary" size="sm" onClick={addService}>
                  <Plus className="h-4 w-4 mr-1" /> Add your first service
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {services.map((svc, idx) => (
                  <div key={svc.id} className="border border-border rounded-lg p-4 bg-card space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">Service {idx + 1}</span>
                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeService(svc.id)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Name</Label>
                        <Input placeholder="API" value={svc.name} onChange={e => updateService(svc.id, 'name', e.target.value)} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Category</Label>
                        <Input placeholder="General" value={svc.category} onChange={e => updateService(svc.id, 'category', e.target.value)} />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Description (optional)</Label>
                      <Input placeholder="Brief description" value={svc.description} onChange={e => updateService(svc.id, 'description', e.target.value)} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" asChild>
              <Link to="/">Cancel</Link>
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Creating…' : 'Create Status Page'}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
};

export default CreateStatusPage;
