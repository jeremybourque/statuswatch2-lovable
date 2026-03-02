import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useSiteSettings, useUpdateSiteSetting } from '@/hooks/use-site-settings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

export default function AdminSettings() {
  const { statusPageId } = useOutletContext<{ statusPageId: string }>();
  const { data: settings, isLoading } = useSiteSettings(statusPageId);
  const updateSetting = useUpdateSiteSetting();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [logoUrl, setLogoUrl] = useState('');

  useEffect(() => {
    if (settings) {
      setTitle(settings.page_title || '');
      setDescription(settings.page_description || '');
      setLogoUrl(settings.logo_url || '');
    }
  }, [settings]);

  const handleSave = async () => {
    try {
      await Promise.all([
        updateSetting.mutateAsync({ key: 'page_title', value: title, status_page_id: statusPageId }),
        updateSetting.mutateAsync({ key: 'page_description', value: description, status_page_id: statusPageId }),
        updateSetting.mutateAsync({ key: 'logo_url', value: logoUrl, status_page_id: statusPageId }),
      ]);
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
            <Label>Page Title</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Logo URL</Label>
            <Input value={logoUrl} onChange={e => setLogoUrl(e.target.value)} placeholder="https://..." />
          </div>
          <Button onClick={handleSave}>Save Settings</Button>
        </CardContent>
      </Card>
    </div>
  );
}
