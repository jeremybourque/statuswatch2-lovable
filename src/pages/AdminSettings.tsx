import { useState, useEffect } from 'react';
import { useSiteSettings, useUpdateSiteSetting } from '@/hooks/use-site-settings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

export default function AdminSettings() {
  const { data: settings, isLoading } = useSiteSettings();
  const updateSetting = useUpdateSiteSetting();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [chartEnabled, setChartEnabled] = useState(true);
  const [chartLabel, setChartLabel] = useState('page load time');
  const [chartDataFormat, setChartDataFormat] = useState('{value}s');

  useEffect(() => {
    if (settings) {
      setTitle(settings.page_title || '');
      setDescription(settings.page_description || '');
      setLogoUrl(settings.logo_url || '');
      setChartEnabled(settings.chart_enabled !== 'false');
      setChartLabel(settings.chart_label || 'page load time');
      setChartDataFormat(settings.chart_data_format || '{value}s');
    }
  }, [settings]);

  const handleSave = async () => {
    try {
      await Promise.all([
        updateSetting.mutateAsync({ key: 'page_title', value: title }),
        updateSetting.mutateAsync({ key: 'page_description', value: description }),
        updateSetting.mutateAsync({ key: 'logo_url', value: logoUrl }),
        updateSetting.mutateAsync({ key: 'chart_enabled', value: String(chartEnabled) }),
        updateSetting.mutateAsync({ key: 'chart_label', value: chartLabel }),
        updateSetting.mutateAsync({ key: 'chart_data_format', value: chartDataFormat }),
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Chart View</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="chart-enabled">Enable chart view on service cards</Label>
            <Switch id="chart-enabled" checked={chartEnabled} onCheckedChange={setChartEnabled} />
          </div>

          {chartEnabled && (
            <>
              <div className="space-y-2">
                <Label>Chart Label</Label>
                <Input value={chartLabel} onChange={e => setChartLabel(e.target.value)} placeholder="e.g. page load time" />
                <p className="text-xs text-muted-foreground">Displayed next to the average value on the card back.</p>
              </div>
              <div className="space-y-2">
                <Label>Data Format</Label>
                <Input value={chartDataFormat} onChange={e => setChartDataFormat(e.target.value)} placeholder="e.g. {value}s or {value}ms" />
                <p className="text-xs text-muted-foreground">Use <code className="bg-muted px-1 rounded">{'{value}'}</code> as a placeholder for the number.</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Button onClick={handleSave}>Save Settings</Button>
    </div>
  );
}
