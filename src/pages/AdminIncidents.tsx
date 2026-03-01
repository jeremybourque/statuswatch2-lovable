import { useState } from 'react';
import { useIncidents, useCreateIncident, useAddIncidentUpdate, useDeleteIncident, useDeleteIncidentUpdate, useUpdateIncidentServices, useUpdateIncidentImpact } from '@/hooks/use-incidents';
import { useServices } from '@/hooks/use-services';
import { incidentStatusConfig, statusConfig, type IncidentStatus, type IncidentImpact } from '@/lib/status-helpers';

const impactToServiceStatus: Record<string, { label: string; color: string }> = {
  none: { label: 'No Impact', color: 'bg-muted text-muted-foreground' },
  minor: { label: statusConfig.degraded.label, color: 'bg-status-degraded/20 text-status-degraded' },
  major: { label: statusConfig.partial_outage.label, color: 'bg-status-partial-outage/20 text-status-partial-outage' },
  critical: { label: statusConfig.major_outage.label, color: 'bg-status-major-outage/20 text-status-major-outage' },
};
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
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
  const updateImpact = useUpdateIncidentImpact();
  const deleteUpdate = useDeleteIncidentUpdate();
  const [createOpen, setCreateOpen] = useState(false);
  const [updateDialogId, setUpdateDialogId] = useState<string | null>(null);
  const [servicesDialogId, setServicesDialogId] = useState<string | null>(null);
  const [impactDialogId, setImpactDialogId] = useState<string | null>(null);

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
            const updates = (incident.incident_updates || []).sort(
              (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            );
            const derivedStatus = updates.length > 0 ? updates[0].status : incident.status;
            const sCfg = incidentStatusConfig[derivedStatus as IncidentStatus];
            const impactCfg = impactToServiceStatus[incident.impact] || impactToServiceStatus.none;
            return (
              <Collapsible key={incident.id}>
                <Card>
                  <CollapsibleTrigger className="w-full">
                    <CardHeader className="py-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium">{incident.title}</CardTitle>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge className={`${impactCfg.color} border-0 text-xs mr-1`}>{impactCfg.label}</Badge>
                          <span className="text-xs text-muted-foreground">{format(new Date(incident.created_at), 'MMM d, HH:mm')}</span>
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                        <Badge className={`${sCfg.color} border-0 text-xs w-[6.5rem] text-center justify-center mr-1.5`}>{sCfg.label}</Badge>
                        {(incident.incident_services || []).map((link: any) => {
                          const svc = services.find(s => s.id === link.service_id);
                          return svc ? <Badge key={svc.id} variant="outline" className="text-xs">{svc.name}</Badge> : null;
                        })}
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-0 space-y-3">
                      {updates.map((u: any) => {
                        const uCfg = incidentStatusConfig[u.status as IncidentStatus] || { label: u.status, color: '' };
                        return (
                          <div key={u.id} className="flex gap-3 text-sm border-l-2 border-border pl-4 py-1 group">
                            <div className="shrink-0 space-y-1">
                              <Badge className={`${uCfg.color} border-0 text-xs w-[6.5rem] text-center justify-center`}>{uCfg.label}</Badge>
                              <p className="text-xs text-muted-foreground">{format(new Date(u.created_at), 'MMM d, HH:mm')}</p>
                            </div>
                            <p className="text-muted-foreground flex-1">{u.message}</p>
                            {updates.length <= 1 ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 h-6 w-6 p-0"
                                onClick={() => toast.error('Cannot delete the last update. Delete the incident instead.')}
                              >
                                <Trash2 className="h-3.5 w-3.5 text-destructive" />
                              </Button>
                            ) : (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 h-6 w-6 p-0"
                                  >
                                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete update?</AlertDialogTitle>
                                    <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={async () => {
                                      try {
                                        await deleteUpdate.mutateAsync(u.id);
                                        toast.success('Update deleted');
                                      } catch { toast.error('Failed to delete update'); }
                                    }}>Delete</AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
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
                            <AddUpdateForm incidentId={incident.id} currentStatus={derivedStatus} onSave={handleAddUpdate} />
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
                        <Dialog open={impactDialogId === incident.id} onOpenChange={v => setImpactDialogId(v ? incident.id : null)}>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm"><Pencil className="h-4 w-4 mr-1" /> Impact</Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader><DialogTitle>Edit Service Impact</DialogTitle></DialogHeader>
                            <EditImpactForm
                              currentImpact={incident.impact}
                              onSave={async (impact) => {
                                try {
                                  await updateImpact.mutateAsync({ id: incident.id, impact });
                                  toast.success('Impact updated');
                                  setImpactDialogId(null);
                                } catch { toast.error('Failed to update impact'); }
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
          <Label>Service Impact</Label>
          <Select value={impact} onValueChange={setImpact}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No Impact</SelectItem>
              <SelectItem value="minor">{statusConfig.degraded.label}</SelectItem>
              <SelectItem value="major">{statusConfig.partial_outage.label}</SelectItem>
              <SelectItem value="critical">{statusConfig.major_outage.label}</SelectItem>
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

function EditImpactForm({ currentImpact, onSave }: { currentImpact: string; onSave: (impact: string) => void }) {
  const [impact, setImpact] = useState(currentImpact);

  return (
    <form onSubmit={e => { e.preventDefault(); onSave(impact); }} className="space-y-4">
      <div className="space-y-2">
        <Label>Service Impact</Label>
        <Select value={impact} onValueChange={setImpact}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No Impact</SelectItem>
            <SelectItem value="minor">{statusConfig.degraded.label}</SelectItem>
            <SelectItem value="major">{statusConfig.partial_outage.label}</SelectItem>
            <SelectItem value="critical">{statusConfig.major_outage.label}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" className="w-full">Save</Button>
    </form>
  );
}
