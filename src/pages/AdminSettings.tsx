import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

export default function AdminSettings() {
  const { statusPageId } = useOutletContext<{ statusPageId: string }>();
  const qc = useQueryClient();

  const { data: statusPage, isLoading } = useQuery({
    queryKey: ['status-page-by-id', statusPageId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('status_pages')
        .select('*')
        .eq('id', statusPageId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!statusPageId,
  });

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (statusPage) {
      setName(statusPage.name || '');
      setDescription(statusPage.description || '');
    }
  }, [statusPage]);

  const updateMutation = useMutation({
    mutationFn: async ({ name, description }: { name: string; description: string }) => {
      const { error } = await supabase
        .from('status_pages')
        .update({ name, description, updated_at: new Date().toISOString() })
        .eq('id', statusPageId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['status-page-by-id', statusPageId] });
      qc.invalidateQueries({ queryKey: ['status-page'] });
      qc.invalidateQueries({ queryKey: ['status-pages'] });
    },
  });

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Name is required');
      return;
    }
    try {
      await updateMutation.mutateAsync({ name: name.trim(), description: description.trim() });
      toast.success('Settings saved');
    } catch {
      toast.error('Failed to save settings');
    }
  };

  if (isLoading) return <p className="text-muted-foreground text-sm">Loading...</p>;

  return (
    <div className="space-y-6 max-w-lg">
      <h2 className="text-2xl font-semibold">Settings</h2>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Page Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Page Name</Label>
            <Input value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Slug</Label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">/</span>
              <Input value={statusPage?.slug || ''} disabled className="font-mono opacity-60" />
            </div>
            <p className="text-xs text-muted-foreground">The slug cannot be changed after creation.</p>
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} />
          </div>
          <Button onClick={handleSave} disabled={updateMutation.isPending}>
            {updateMutation.isPending ? 'Saving...' : 'Save Settings'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
