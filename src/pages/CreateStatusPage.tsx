import { useState, useEffect, useRef, useCallback } from 'react';
import { Activity, ArrowLeft, ArrowRight, Pencil } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ServiceSetupStep, type ServiceEntry } from '@/components/create-status-page/ServiceSetupStep';

const CreateStatusPage = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<'forward' | 'back'>('forward');
  const [animating, setAnimating] = useState(false);

  // Step 0 state
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugWarning, setSlugWarning] = useState('');
  const [description, setDescription] = useState('');

  // Step 1 state
  const [services, setServices] = useState<ServiceEntry[]>([]);
  const [saving, setSaving] = useState(false);

  const filledServiceCount = services.filter(s => s.name.trim()).length;
  const needsConfirm = filledServiceCount > 2;

  const CancelButton = () => {
    if (needsConfirm) {
      return (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button type="button" variant="ghost">Cancel</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Discard progress?</AlertDialogTitle>
              <AlertDialogDescription>
                You've added {filledServiceCount} services. Are you sure you want to cancel? All progress will be lost.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep editing</AlertDialogCancel>
              <AlertDialogAction asChild>
                <Link to="/">Discard</Link>
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      );
    }
    return (
      <Button type="button" variant="ghost" asChild>
        <Link to="/">Cancel</Link>
      </Button>
    );
  };

  // Debounced slug deduplication
  const slugTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const deduplicateSlug = useCallback((raw: string) => {
    clearTimeout(slugTimerRef.current);
    const base = raw.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    setSlug(base);
    setSlugWarning('');
    if (!base) return;
    slugTimerRef.current = setTimeout(async () => {
      const { data: existing } = await supabase
        .from('status_pages')
        .select('slug')
        .like('slug', `${base}%`);
      if (existing && existing.length > 0) {
        const taken = new Set(existing.map(r => r.slug));
        if (taken.has(base)) {
          let i = 1;
          while (taken.has(`${base}-${i}`)) i++;
          setSlug(`${base}-${i}`);
        }
      }
    }, 400);
  }, []);

  const handleSlugManualEdit = (value: string) => {
    const cleaned = value.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setSlug(cleaned);
    setSlugWarning('');
  };

  const checkSlugAvailability = async () => {
    const trimmed = slug.trim();
    if (!trimmed) return;
    const { data: existing } = await supabase
      .from('status_pages')
      .select('slug')
      .eq('slug', trimmed);
    if (existing && existing.length > 0) {
      setSlugWarning(`"/${trimmed}" is already taken. It will be adjusted automatically on save.`);
    } else {
      setSlugWarning('');
    }
  };

  const autoSlug = (value: string) => {
    setName(value);
    deduplicateSlug(value);
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

  const handleGoToPreview = (e?: React.FormEvent) => {
    e?.preventDefault();
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
              <button
                key={i}
                type="button"
                onClick={() => goTo(i)}
                className={`h-2 rounded-full transition-all duration-300 cursor-pointer hover:opacity-80 ${
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
                      <Input id="slug" placeholder="my-app-status" value={slug} onChange={e => handleSlugManualEdit(e.target.value)} onBlur={checkSlugAvailability} />
                      {slugWarning ? (
                        <p className="text-xs text-destructive">{slugWarning}</p>
                      ) : (
                        <p className="text-xs text-muted-foreground">/{slug || '...'}</p>
                      )}
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
            <div className="space-y-8">
              <ServiceSetupStep
                services={services}
                onServicesChange={setServices}
                pageName={name}
              />

              <div className="flex justify-between pt-2">
                <CancelButton />
                <div className="flex gap-3">
                  <Button type="button" variant="outline" onClick={() => goTo(0)}>
                    <ArrowLeft className="h-4 w-4 mr-1" /> Back
                  </Button>
                  <Button
                    type="button"
                    onClick={(e) => handleGoToPreview(e as any)}
                  >
                    Review & Create <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-8">
              <div>
                <h2 className="text-xl font-semibold text-foreground mb-2">Review & Create</h2>
                <p className="text-sm text-muted-foreground">Confirm your details before creating the status page.</p>
              </div>

              {/* Page details */}
              <div className="border border-border rounded-lg bg-card p-5 space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm flex-1">
                    <div>
                      <span className="text-muted-foreground">Name</span>
                      <p className="font-medium text-foreground">{name}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Slug</span>
                      <p className="font-medium text-foreground">/{slug}</p>
                    </div>
                  </div>
                  <Button type="button" variant="ghost" size="sm" className="h-7 gap-1 px-2 shrink-0" onClick={() => goTo(0)}>
                    <ArrowLeft className="h-3.5 w-3.5" />
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                </div>
                {description && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Description</span>
                    <p className="font-medium text-foreground">{description}</p>
                  </div>
                )}
              </div>

              {/* Services summary */}
              <div className="border border-border rounded-lg bg-card p-5 space-y-3">
                <div className="flex items-center justify-between">
                  {(() => {
                    const svcCount = services.filter(s => s.name.trim()).length;
                    const grpCount = Object.keys(services.filter(s => s.name.trim()).reduce<Record<string, boolean>>((acc, s) => { acc[s.category.trim() || 'General'] = true; return acc; }, {})).length;
                      return (
                      <h3 className="text-sm font-semibold text-foreground">
                        {svcCount} {svcCount === 1 ? 'service' : 'services'} <span className="text-muted-foreground font-normal">in</span> {grpCount} {grpCount === 1 ? 'group' : 'groups'}
                      </h3>
                    );
                  })()}
                  <Button type="button" variant="ghost" size="sm" className="h-7 gap-1 px-2" onClick={() => goTo(1)}>
                    <ArrowLeft className="h-3.5 w-3.5" />
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="space-y-4">
                  {Object.entries(
                    services.filter(s => s.name.trim()).reduce<Record<string, ServiceEntry[]>>((acc, s) => {
                      const cat = s.category.trim() || 'General';
                      (acc[cat] = acc[cat] || []).push(s);
                      return acc;
                    }, {})
                  ).map(([category, items]) => (
                    <div key={category}>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">{category}</p>
                      <div className="pl-3 space-y-1.5">
                        {items.map(svc => (
                          <div key={svc.id} className="flex items-baseline gap-2">
                            <p className="text-sm font-medium text-foreground">{svc.name}</p>
                            {svc.description && (
                              <p className="text-xs text-muted-foreground">{svc.description}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-between pt-2">
                <CancelButton />
                <div className="flex gap-3">
                  <Button type="button" variant="outline" onClick={() => goTo(1)}>
                    <ArrowLeft className="h-4 w-4 mr-1" /> Back
                  </Button>
                  <Button onClick={handleSubmit} disabled={saving}>
                    {saving ? 'Creating…' : 'Create Status Page'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default CreateStatusPage;
