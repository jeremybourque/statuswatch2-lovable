import { useState } from 'react';
import { useServices, useCreateService, useUpdateService, useDeleteService } from '@/hooks/use-services';
import { statusConfig, type ServiceStatus } from '@/lib/status-helpers';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminServices() {
  const { data: services = [], isLoading } = useServices();
  const createService = useCreateService();
  const updateService = useUpdateService();
  const deleteService = useDeleteService();
  const [editService, setEditService] = useState<any>(null);
  const [open, setOpen] = useState(false);

  const handleSave = async (formData: any) => {
    try {
      if (editService?.id) {
        await updateService.mutateAsync({ id: editService.id, ...formData });
        toast.success('Service updated');
      } else {
        await createService.mutateAsync(formData);
        toast.success('Service created');
      }
      setOpen(false);
      setEditService(null);
    } catch {
      toast.error('Failed to save service');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteService.mutateAsync(id);
      toast.success('Service deleted');
    } catch {
      toast.error('Failed to delete service');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Services</h2>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditService(null); }}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add Service</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-xl">
            <DialogHeader>
              <DialogTitle>{editService ? 'Edit Service' : 'New Service'}</DialogTitle>
            </DialogHeader>
            <ServiceForm initial={editService} onSave={handleSave} />
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-sm">Loading...</p>
      ) : (
        <div className="space-y-2">
          {services.map(service => {
            const cfg = statusConfig[service.status as ServiceStatus];
            return (
              <Card key={service.id}>
                <CardContent className="flex items-center justify-between py-4 px-6">
                  <div className="flex items-center gap-3">
                    <span className={`h-2.5 w-2.5 rounded-full ${cfg.dotClass}`} />
                    <div>
                      <p className="text-sm font-medium">{service.name}</p>
                      <p className="text-xs text-muted-foreground">{service.category} · {cfg.label}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditService(service); setOpen(true); }}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(service.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ServiceForm({ initial, onSave }: { initial?: any; onSave: (data: any) => void }) {
  const [name, setName] = useState(initial?.name || '');
  const [description, setDescription] = useState(initial?.description || '');
  const [descFocused, setDescFocused] = useState(false);
  const [category, setCategory] = useState(initial?.category || 'General');
  
  const [displayOrder, setDisplayOrder] = useState(initial?.display_order?.toString() || '0');
  const chartModeFromInitial = () => {
    if (!initial) return 'none';
    if (initial.chart_enabled === false) return 'none';
    if (initial.chart_label === 'response time') return 'response';
    return 'page_load';
  };
  const [chartMode, setChartMode] = useState(chartModeFromInitial());

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const chartSettings = chartMode === 'none'
      ? { chart_enabled: false, chart_label: 'page load time', chart_data_format: '{value}s' }
      : chartMode === 'response'
        ? { chart_enabled: true, chart_label: 'response time', chart_data_format: '{value}ms' }
        : { chart_enabled: true, chart_label: 'page load time', chart_data_format: '{value}s' };
    onSave({
      name, description, category,
      display_order: parseInt(displayOrder) || 0,
      ...chartSettings,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-3">
        <Label>Name</Label>
        <Input value={name} onChange={e => setName(e.target.value)} required />

        <Label className="self-start pt-2">Description</Label>
        <div className="space-y-1">
          <Textarea rows={2} className="min-h-0 resize-none" value={description} onChange={e => { if (e.target.value.length <= 100) setDescription(e.target.value); }} onFocus={() => setDescFocused(true)} onBlur={() => setDescFocused(false)} />
          <span className={`text-xs transition-opacity block text-right ${descFocused ? 'opacity-100' : 'opacity-0'} ${description.length > 100 ? 'text-destructive' : 'text-muted-foreground'}`}>{description.length} / 100</span>
        </div>

        <Label>Category</Label>
        <Input value={category} onChange={e => setCategory(e.target.value)} />


        <Label>Metric</Label>
        <Select value={chartMode} onValueChange={setChartMode}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="page_load">Page Load Time</SelectItem>
            <SelectItem value="response">Response Time</SelectItem>
            <SelectItem value="none">(none)</SelectItem>
          </SelectContent>
        </Select>

        <Label>Display Order</Label>
        <Input type="number" value={displayOrder} onChange={e => setDisplayOrder(e.target.value)} />
      </div>

      <Button type="submit" className="w-full">Save</Button>
    </form>
  );
}
