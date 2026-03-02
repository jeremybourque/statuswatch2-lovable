import { useState } from 'react';
import { Upload, Loader2, AlertCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ImportedService {
  name: string;
  description: string;
  category: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (services: ImportedService[]) => void;
}

type State =
  | { phase: 'input' }
  | { phase: 'loading' }
  | { phase: 'preview'; type: string; services: ImportedService[]; selected: Set<number> }
  | { phase: 'error'; message: string };

export function ImportServicesDialog({ open, onOpenChange, onImport }: Props) {
  const [url, setUrl] = useState('');
  const [state, setState] = useState<State>({ phase: 'input' });

  const handleAnalyze = async () => {
    if (!url.trim()) return;
    setState({ phase: 'loading' });

    try {
      const { data, error } = await supabase.functions.invoke('import-services', {
        body: { url: url.trim() },
      });

      if (error) throw new Error(error.message);
      if (!data?.success) throw new Error(data?.error || 'Import failed');

      if (data.type === 'unknown' || !data.services?.length) {
        setState({ phase: 'error', message: data.services?.length === 0 && data.type !== 'unknown'
          ? 'No services found on this page.'
          : 'This resource type is not recognized. Please provide a status page or system diagram URL.' });
        return;
      }

      setState({
        phase: 'preview',
        type: data.type,
        services: data.services,
        selected: new Set(data.services.map((_: any, i: number) => i)),
      });
    } catch (err: any) {
      console.error('Import error:', err);
      setState({ phase: 'error', message: err.message || 'Failed to import services' });
    }
  };

  const toggleService = (idx: number) => {
    if (state.phase !== 'preview') return;
    const next = new Set(state.selected);
    if (next.has(idx)) next.delete(idx);
    else next.add(idx);
    setState({ ...state, selected: next });
  };

  const handleConfirm = () => {
    if (state.phase !== 'preview') return;
    const selected = state.services.filter((_, i) => state.selected.has(i));
    onImport(selected);
    toast.success(`Imported ${selected.length} service${selected.length === 1 ? '' : 's'}`);
    handleClose();
  };

  const handleClose = () => {
    setState({ phase: 'input' });
    setUrl('');
    onOpenChange(false);
  };

  const typeLabel = state.phase === 'preview'
    ? state.type === 'status_page' ? 'Status Page' : 'System Diagram'
    : '';

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Import Services from URL</DialogTitle>
          <DialogDescription>
            Provide a status page or system diagram URL to automatically extract services.
          </DialogDescription>
        </DialogHeader>

        {state.phase === 'input' && (
          <div className="space-y-4 py-2">
            <Input
              placeholder="https://status.example.com"
              value={url}
              onChange={e => setUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAnalyze()}
            />
            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button onClick={handleAnalyze} disabled={!url.trim()}>
                <Upload className="h-4 w-4 mr-1" /> Analyze
              </Button>
            </DialogFooter>
          </div>
        )}

        {state.phase === 'loading' && (
          <div className="flex flex-col items-center gap-3 py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Scraping & analyzing…</p>
          </div>
        )}

        {state.phase === 'error' && (
          <div className="space-y-4 py-2">
            <div className="flex items-start gap-3 p-4 rounded-lg border border-destructive/30 bg-destructive/5">
              <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <p className="text-sm text-foreground">{state.message}</p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>Close</Button>
              <Button onClick={() => setState({ phase: 'input' })}>Try Again</Button>
            </DialogFooter>
          </div>
        )}

        {state.phase === 'preview' && (
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Detected <span className="font-medium text-foreground">{typeLabel}</span> — {state.services.length} service{state.services.length === 1 ? '' : 's'} found.
            </p>

            <div className="max-h-64 overflow-y-auto space-y-3 pr-1">
              {Object.entries(
                state.services.reduce<Record<string, { svc: ImportedService; idx: number }[]>>((acc, svc, i) => {
                  (acc[svc.category] = acc[svc.category] || []).push({ svc, idx: i });
                  return acc;
                }, {})
              ).map(([category, items]) => (
                <div key={category}>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">{category}</p>
                  <div className="space-y-1">
                    {items.map(({ svc, idx }) => (
                      <label
                        key={idx}
                        className="flex items-start gap-2.5 p-2 rounded-md hover:bg-muted/50 cursor-pointer transition-colors"
                      >
                        <Checkbox
                          checked={state.selected.has(idx)}
                          onCheckedChange={() => toggleService(idx)}
                          className="mt-0.5"
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground leading-tight">{svc.name}</p>
                          {svc.description && (
                            <p className="text-xs text-muted-foreground mt-0.5">{svc.description}</p>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button onClick={handleConfirm} disabled={state.selected.size === 0}>
                Import {state.selected.size} Service{state.selected.size === 1 ? '' : 's'}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
