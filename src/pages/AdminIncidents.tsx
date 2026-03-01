import { useState } from 'react';
import { useIncidents, useCreateIncident, useAddIncidentUpdate, useDeleteIncident, useUpdateIncidentServices } from '@/hooks/use-incidents';
import { useServices } from '@/hooks/use-services';
import { incidentStatusConfig, impactConfig, type IncidentStatus, type IncidentImpact } from '@/lib/status-helpers';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Plus, ChevronDown, Trash2, MessageSquarePlus, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function AdminIncidents() {
  const { data: incidents = [], isLoading } = useIncidents();
  const { data: services = [] } = useServices();
  const createIncident = useCreateIncident();
  const addUpdate = useAddIncidentUpdate();
  const deleteIncident = useDeleteIncident();
  const updateServices = useUpdateIncidentServices();
  const [createOpen, setCreateOpen] = useState(false);
  const [updateDialogId, setUpdateDialogId] = useState<string | null>(null);
  const [servicesDialogId, setServicesDialogId] = useState<string | null>(null);

  const handleCreate = async (data: any) => {
    try {
      await createIncident.mutateAsync(data);
      toast.success('Incident created');
      setCreateOpen(false);
    } catch {
      toast.error('Failed to create incident');
    }
  };

  const handleAddUpdate = async (data: { incident_id: string; status: string; message: string }) => {
    try {
      await addUpdate.mutateAsync(data);
      toast.success('Update added');
      setUpdateDialogId(null);
    } catch {
      toast.error('Failed to add update');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteIncident.mutateAsync(id);
      toast.success('Incident deleted');
    } catch {
      toast.error('Failed to delete incident');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Incidents</h2>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" /> New Incident</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Incident</DialogTitle>
            </DialogHeader>
            <CreateIncidentForm services={services} onSave={handleCreate} />
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-sm">Loading...</p>
      ) : (
        <div className="space-y-3">
          {incidents.map(incident => {
            const sCfg = incidentStatusConfig[incident.status as IncidentStatus];
            const iCfg = impactConfig[incident.impact as IncidentImpact];
            const updates = (incident.incident_updates || []).sort(
              (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            );
            return (
              <Collapsible key={incident.id}>
                <Card>
                  <CollapsibleTrigger className="w-full">
                    <CardHeader className="flex flex-row items-center justify-between py-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <CardTitle className="text-sm font-medium">{incident.title}</CardTitle>
                        <Badge className={`${sCfg.color} border-0 text-xs`}>{sCfg.label}</Badge>
                        <Badge className={`${iCfg.color} border-0 text-xs`}>{iCfg.label}</Badge>
                        {(incident.incident_services || []).map((link: any) => {
                          const svc = services.find(s => s.id === link.service_id);
                          return svc ? <Badge key={svc.id} variant="outline" className="text-xs py-0 px-1.5">{svc.name}</Badge> : null;
                        })}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{format(new Date(incident.created_at), 'MMM d, HH:mm')}</span>
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-0 space-y-3">
                      {updates.map((u: any) => {
                        const uCfg = incidentStatusConfig[u.status as IncidentStatus] || { label: u.status, color: '' };
                        return (
                          <div key={u.id} className="flex gap-3 text-sm border-l-2 border-border pl-4 py-1">
                            <div className="shrink-0 space-y-1">
                              <Badge className={`${uCfg.color} border-0 text-xs`}>{uCfg.label}</Badge>
                              <p className="text-xs text-muted-foreground">{format(new Date(u.created_at), 'MMM d, HH:mm')}</p>
                            </div>
                            <p className="text-muted-foreground">{u.message}</p>
                          </div>
                        );
                      })}
                      <div className="flex gap-2 pt-2 flex-wrap">
                        <Dialog open={updateDialogId === incident.id} onOpenChange={v => setUpdateDialogId(v ? incident.id : null)}>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm"><MessageSquarePlus className="h-4 w-4 mr-1" /> Add Update</Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader><DialogTitle>Add Update</DialogTitle></DialogHeader>
                            <AddUpdateForm incidentId={incident.id} currentStatus={incident.status} onSave={handleAddUpdate} />
                          </DialogContent>
                        </Dialog>
                        <Dialog open={servicesDialogId === incident.id} onOpenChange={v => setServicesDialogId(v ? incident.id : null)}>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm"><Pencil className="h-4 w-4 mr-1" /> Services</Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader><DialogTitle>Edit Affected Services</DialogTitle></DialogHeader>
                            <EditServicesForm
                              services={services}
                              currentServiceIds={(incident.incident_services || []).map((l: any) => l.service_id)}
                              onSave={async (ids) => {
                                try {
                                  await updateServices.mutateAsync({ incident_id: incident.id, service_ids: ids });
                                  toast.success('Services updated');
                                  setServicesDialogId(null);
                                } catch { toast.error('Failed to update services'); }
                              }}
                            />
                          </DialogContent>
                        </Dialog>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(incident.id)}>
                          <Trash2 className="h-4 w-4 text-destructive mr-1" /> Delete
                        </Button>
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CreateIncidentForm({ services, onSave }: { services: any[]; onSave: (d: any) => void }) {
  const [title, setTitle] = useState('');
  const [status, setStatus] = useState('investigating');
  const [impact, setImpact] = useState('minor');
  const [message, setMessage] = useState('');
  const [selectedServices, setSelectedServices] = useState<string[]>([]);

  const toggleService = (id: string) => {
    setSelectedServices(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
  };

  return (
    <form onSubmit={e => { e.preventDefault(); onSave({ title, status, impact, message, service_ids: selectedServices }); }} className="space-y-4">
      <div className="space-y-2">
        <Label>Title</Label>
        <Input value={title} onChange={e => setTitle(e.target.value)} required />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Status</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="investigating">Investigating</SelectItem>
              <SelectItem value="identified">Identified</SelectItem>
              <SelectItem value="monitoring">Monitoring</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Impact</Label>
          <Select value={impact} onValueChange={setImpact}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              <SelectItem value="minor">Minor</SelectItem>
              <SelectItem value="major">Major</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label>Initial Message</Label>
        <Textarea value={message} onChange={e => setMessage(e.target.value)} required />
      </div>
      <div className="space-y-2">
        <Label>Affected Services</Label>
        <div className="space-y-2 max-h-40 overflow-y-auto">
          {services.map(s => (
            <label key={s.id} className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox checked={selectedServices.includes(s.id)} onCheckedChange={() => toggleService(s.id)} />
              {s.name}
            </label>
          ))}
        </div>
      </div>
      <Button type="submit" className="w-full">Create Incident</Button>
    </form>
  );
}

function AddUpdateForm({ incidentId, currentStatus, onSave }: { incidentId: string; currentStatus: string; onSave: (d: any) => void }) {
  const [status, setStatus] = useState(currentStatus);
  const [message, setMessage] = useState('');

  return (
    <form onSubmit={e => { e.preventDefault(); onSave({ incident_id: incidentId, status, message }); }} className="space-y-4">
      <div className="space-y-2">
        <Label>Status</Label>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="investigating">Investigating</SelectItem>
            <SelectItem value="identified">Identified</SelectItem>
            <SelectItem value="monitoring">Monitoring</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Message</Label>
        <Textarea value={message} onChange={e => setMessage(e.target.value)} required />
      </div>
      <Button type="submit" className="w-full">Add Update</Button>
    </form>
  );
}

function EditServicesForm({ services, currentServiceIds, onSave }: { services: any[]; currentServiceIds: string[]; onSave: (ids: string[]) => void }) {
  const [selected, setSelected] = useState<string[]>(currentServiceIds);

  const toggle = (id: string) => {
    setSelected(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
  };

  return (
    <form onSubmit={e => { e.preventDefault(); onSave(selected); }} className="space-y-4">
      <div className="space-y-2 max-h-60 overflow-y-auto">
        {services.map(s => (
          <label key={s.id} className="flex items-center gap-2 text-sm cursor-pointer">
            <Checkbox checked={selected.includes(s.id)} onCheckedChange={() => toggle(s.id)} />
            {s.name}
          </label>
        ))}
      </div>
      <Button type="submit" className="w-full">Save</Button>
    </form>
  );
}
