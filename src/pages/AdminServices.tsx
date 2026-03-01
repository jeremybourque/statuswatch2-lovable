import { useState } from 'react';
import { useServices, useCreateService, useUpdateService, useDeleteService } from '@/hooks/use-services';
import { statusConfig, type ServiceStatus } from '@/lib/status-helpers';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
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
          <DialogContent>
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
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={() => { setEditService(service); setOpen(true); }}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(service.id)}>
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
  const [status, setStatus] = useState(initial?.status || 'operational');
  const [displayOrder, setDisplayOrder] = useState(initial?.display_order?.toString() || '0');
  const [chartEnabled, setChartEnabled] = useState(initial?.chart_enabled !== false);
  const [chartLabel, setChartLabel] = useState(initial?.chart_label || 'page load time');
  const [chartDataFormat, setChartDataFormat] = useState(initial?.chart_data_format || '{value}s');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      name, description, category, status,
      display_order: parseInt(displayOrder) || 0,
      chart_enabled: chartEnabled,
      chart_label: chartLabel,
      chart_data_format: chartDataFormat,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Name</Label>
        <Input value={name} onChange={e => setName(e.target.value)} required />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Description</Label>
          <span className={`text-xs transition-opacity ${descFocused ? 'opacity-100' : 'opacity-0'} ${description.length > 100 ? 'text-destructive' : 'text-muted-foreground'}`}>{description.length} / 100</span>
        </div>
        <Textarea rows={2} className="min-h-0 resize-none" value={description} onChange={e => { if (e.target.value.length <= 100) setDescription(e.target.value); }} onFocus={() => setDescFocused(true)} onBlur={() => setDescFocused(false)} />
      </div>
      <div className="space-y-2">
        <Label>Category</Label>
        <Input value={category} onChange={e => setCategory(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>Status</Label>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="operational">Operational</SelectItem>
            <SelectItem value="degraded">Degraded</SelectItem>
            <SelectItem value="partial_outage">Partial Outage</SelectItem>
            <SelectItem value="major_outage">Major Outage</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Display Order</Label>
        <Input type="number" value={displayOrder} onChange={e => setDisplayOrder(e.target.value)} />
      </div>

      <div className="border-t border-border pt-4 space-y-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="chart-toggle">Chart View</Label>
          <Switch id="chart-toggle" checked={chartEnabled} onCheckedChange={setChartEnabled} />
        </div>
        {chartEnabled && (
          <>
            <div className="space-y-2">
              <Label>Chart Label</Label>
              <Input value={chartLabel} onChange={e => setChartLabel(e.target.value)} placeholder="e.g. page load time" />
            </div>
            <div className="space-y-2">
              <Label>Data Format</Label>
              <Input value={chartDataFormat} onChange={e => setChartDataFormat(e.target.value)} placeholder="e.g. {value}s or {value}ms" />
              <p className="text-xs text-muted-foreground">Use <code className="bg-muted px-1 rounded">{'{value}'}</code> as a placeholder.</p>
            </div>
          </>
        )}
      </div>

      <Button type="submit" className="w-full">Save</Button>
    </form>
  );
}
