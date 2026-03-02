import { useState } from 'react';
import { Activity, ArrowLeft, ArrowRight, Plus, X, CheckCircle2, Globe } from 'lucide-react';
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
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<'forward' | 'back'>('forward');
  const [animating, setAnimating] = useState(false);

  // Step 0 state
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');

  // Step 1 state
  const [services, setServices] = useState<ServiceEntry[]>([]);
  const [saving, setSaving] = useState(false);

  const autoSlug = (value: string) => {
    setName(value);
    setSlug(value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
  };

  const goTo = (nextStep: number) => {
    if (animating) return;
    setDirection(nextStep > step ? 'forward' : 'back');
    setAnimating(true);
    setTimeout(() => {
      setStep(nextStep);
      setAnimating(false);
    }, 300);
  };

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !slug.trim()) {
      toast.error('Name and slug are required');
      return;
    }
    goTo(1);
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

  const handleGoToPreview = (e: React.FormEvent) => {
    e.preventDefault();
    const validServices = services.filter(s => s.name.trim());
    if (validServices.length === 0) {
      toast.error('Add at least one service');
      return;
    }
    goTo(2);
  };

  const handleSubmit = async () => {
    const validServices = services.filter(s => s.name.trim());

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

  const slideClass = animating
    ? direction === 'forward'
      ? 'animate-slide-out-left'
      : 'animate-slide-out-right'
    : direction === 'forward'
      ? 'animate-slide-in-right'
      : 'animate-slide-in-left';

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

      <main className="max-w-3xl mx-auto px-4 py-8 overflow-hidden">
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-2">
            {[0, 1, 2].map(i => (
              <div
                key={i}
                className={`h-2 rounded-full transition-all duration-300 ${
                  i === step ? 'w-6 bg-primary' : 'w-2 bg-muted-foreground/30'
                }`}
              />
            ))}
          </div>
        </div>

        <div className={`${slideClass}`}>
          {step === 0 && (
            <form onSubmit={handleNext} className="space-y-8">
              <div>
                <h2 className="text-xl font-semibold text-foreground mb-4">Create Status Page</h2>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Page Name</Label>
                      <Input id="name" placeholder="My App Status" value={name} onChange={e => autoSlug(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="slug">Slug</Label>
                      <Input id="slug" placeholder="my-app-status" value={slug} onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} />
                      <p className="text-xs text-muted-foreground">/{slug || '...'}</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description (optional)</Label>
                    <Textarea id="description" placeholder="A brief description of what this status page monitors" value={description} onChange={e => setDescription(e.target.value)} rows={2} />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" asChild>
                  <Link to="/">Cancel</Link>
                </Button>
                <Button type="submit">
                  Set Up Services <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </form>
          )}

          {step === 1 && (
            <form onSubmit={handleGoToPreview} className="space-y-8">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-semibold text-foreground">Set Up Services</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      Add services to monitor for <span className="font-medium text-foreground">{name}</span>
                    </p>
                  </div>
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
                <Button type="button" variant="outline" onClick={() => goTo(0)}>
                  <ArrowLeft className="h-4 w-4 mr-1" /> Back
                </Button>
                <Button type="submit">
                  Preview <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </form>
          )}

          {step === 2 && (
            <div className="space-y-8">
              <div>
                <h2 className="text-xl font-semibold text-foreground mb-2">Preview</h2>
                <p className="text-sm text-muted-foreground">Review your status page before creating it.</p>
              </div>

              {/* Preview card */}
              <div className="border border-border rounded-xl overflow-hidden bg-card">
                {/* Mock header */}
                <div className="border-b border-border px-6 py-4 flex items-center gap-3">
                  <Activity className="h-5 w-5 text-primary" />
                  <span className="font-semibold text-foreground">{name}</span>
                </div>

                <div className="px-6 py-5 space-y-5">
                  {/* Overall status banner */}
                  <div className="flex items-center gap-2 rounded-lg bg-status-operational/10 border border-status-operational/20 px-4 py-3">
                    <CheckCircle2 className="h-5 w-5 text-status-operational" />
                    <span className="text-sm font-medium text-status-operational">All Systems Operational</span>
                  </div>

                  {description && (
                    <p className="text-sm text-muted-foreground">{description}</p>
                  )}

                  {/* Services preview */}
                  <div className="space-y-2">
                    {Object.entries(
                      services.filter(s => s.name.trim()).reduce<Record<string, ServiceEntry[]>>((acc, s) => {
                        const cat = s.category.trim() || 'General';
                        (acc[cat] = acc[cat] || []).push(s);
                        return acc;
                      }, {})
                    ).map(([category, items]) => (
                      <div key={category} className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{category}</p>
                        {items.map(svc => (
                          <div key={svc.id} className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
                            <div>
                              <span className="text-sm font-medium text-foreground">{svc.name}</span>
                              {svc.description && (
                                <p className="text-xs text-muted-foreground mt-0.5">{svc.description}</p>
                              )}
                            </div>
                            <span className="text-xs font-medium text-status-operational">Operational</span>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>

                  {/* URL preview */}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t border-border">
                    <Globe className="h-3.5 w-3.5" />
                    <span>/{slug}</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => goTo(1)}>
                  <ArrowLeft className="h-4 w-4 mr-1" /> Back
                </Button>
                <Button onClick={handleSubmit} disabled={saving}>
                  {saving ? 'Creating…' : 'Create Status Page'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default CreateStatusPage;
