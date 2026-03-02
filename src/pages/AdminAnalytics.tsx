import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Eye, Users, Clock, TrendingUp, Globe, Monitor, Smartphone, Tablet } from 'lucide-react';
import { format, subDays } from 'date-fns';

function generateFakeData() {
  const now = new Date();
  const pageViews: { date: string; views: number; visitors: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = subDays(now, i);
    const base = 120 + Math.floor(Math.random() * 80);
    const weekday = d.getDay();
    const mult = weekday === 0 || weekday === 6 ? 0.6 : 1;
    const views = Math.floor(base * mult + Math.random() * 40);
    pageViews.push({
      date: format(d, 'MMM d'),
      views,
      visitors: Math.floor(views * (0.55 + Math.random() * 0.15)),
    });
  }

  const hourly: { hour: string; views: number }[] = [];
  for (let h = 0; h < 24; h++) {
    const peak = h >= 9 && h <= 17 ? 1.8 : h >= 6 && h <= 21 ? 1 : 0.3;
    hourly.push({
      hour: `${h.toString().padStart(2, '0')}:00`,
      views: Math.floor(peak * (15 + Math.random() * 20)),
    });
  }

  const pages = [
    { page: '/ (Status)', views: 3842, avgTime: '1m 24s' },
    { page: '/history', views: 1256, avgTime: '2m 08s' },
    { page: '/admin/incidents', views: 487, avgTime: '3m 42s' },
    { page: '/admin/services', views: 321, avgTime: '2m 55s' },
    { page: '/admin/settings', views: 198, avgTime: '1m 18s' },
    { page: '/admin/analytics', views: 145, avgTime: '4m 02s' },
  ];

  const referrers = [
    { source: 'Direct', visits: 2104 },
    { source: 'Google', visits: 1487 },
    { source: 'Twitter/X', visits: 623 },
    { source: 'GitHub', visits: 412 },
    { source: 'Slack', visits: 287 },
    { source: 'Other', visits: 198 },
  ];

  const devices = [
    { name: 'Desktop', value: 62 },
    { name: 'Mobile', value: 31 },
    { name: 'Tablet', value: 7 },
  ];

  const browsers = [
    { name: 'Chrome', value: 54 },
    { name: 'Safari', value: 22 },
    { name: 'Firefox', value: 12 },
    { name: 'Edge', value: 8 },
    { name: 'Other', value: 4 },
  ];

  const totalViews = pageViews.reduce((s, d) => s + d.views, 0);
  const totalVisitors = pageViews.reduce((s, d) => s + d.visitors, 0);

  return { pageViews, hourly, pages, referrers, devices, browsers, totalViews, totalVisitors };
}

const DEVICE_ICONS = { Desktop: Monitor, Mobile: Smartphone, Tablet: Tablet };
const PIE_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--primary) / 0.7)',
  'hsl(var(--primary) / 0.45)',
  'hsl(var(--primary) / 0.3)',
  'hsl(var(--primary) / 0.18)',
];

export default function AdminAnalytics() {
  const data = useMemo(generateFakeData, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-foreground">Analytics</h2>
        <p className="text-sm text-muted-foreground mt-1">Status page visitor insights · Last 30 days</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard icon={Eye} label="Page Views" value={data.totalViews.toLocaleString()} delta="+12.3%" />
        <KpiCard icon={Users} label="Unique Visitors" value={data.totalVisitors.toLocaleString()} delta="+8.7%" />
        <KpiCard icon={Clock} label="Avg. Session" value="2m 14s" delta="+0.4%" />
        <KpiCard icon={TrendingUp} label="Bounce Rate" value="38.2%" delta="-2.1%" positive />
      </div>

      {/* Views over time */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">Views &amp; Visitors</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.pageViews} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="viewsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 13 }} />
                <Area type="monotone" dataKey="views" stroke="hsl(var(--primary))" fill="url(#viewsGrad)" strokeWidth={2} />
                <Area type="monotone" dataKey="visitors" stroke="hsl(var(--primary) / 0.5)" fill="transparent" strokeWidth={1.5} strokeDasharray="4 4" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Hourly traffic */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">Traffic by Hour (Today)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.hourly} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="hour" tick={{ fontSize: 10 }} interval={3} className="fill-muted-foreground" />
                  <YAxis tick={{ fontSize: 10 }} className="fill-muted-foreground" />
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 13 }} />
                  <Bar dataKey="views" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Top pages */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">Top Pages</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.pages.map((p) => (
                <div key={p.page} className="flex items-center justify-between text-sm">
                  <span className="font-mono text-muted-foreground truncate max-w-[55%]">{p.page}</span>
                  <div className="flex items-center gap-4">
                    <span className="text-foreground font-medium">{p.views.toLocaleString()}</span>
                    <span className="text-muted-foreground text-xs w-16 text-right">{p.avgTime}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {/* Referrers */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex items-center gap-2"><Globe className="h-4 w-4" /> Referrers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2.5">
              {data.referrers.map((r) => {
                const max = data.referrers[0].visits;
                return (
                  <div key={r.source} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-foreground">{r.source}</span>
                      <span className="text-muted-foreground">{r.visits.toLocaleString()}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(r.visits / max) * 100}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Devices */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">Devices</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[140px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={data.devices} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={35} outerRadius={60} paddingAngle={3}>
                    {data.devices.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 13 }} formatter={(v: number) => `${v}%`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-4 mt-2">
              {data.devices.map((d, i) => {
                const Icon = DEVICE_ICONS[d.name as keyof typeof DEVICE_ICONS] || Monitor;
                return (
                  <div key={d.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[i] }} />
                    <Icon className="h-3 w-3" />
                    <span>{d.name} {d.value}%</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Browsers */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">Browsers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2.5">
              {data.browsers.map((b, i) => (
                <div key={b.name} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-foreground">{b.name}</span>
                    <span className="text-muted-foreground">{b.value}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${b.value}%`, backgroundColor: PIE_COLORS[i] }} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, delta, positive }: { icon: React.ElementType; label: string; value: string; delta: string; positive?: boolean }) {
  const isNeg = delta.startsWith('-');
  const color = label === 'Bounce Rate' ? (isNeg ? 'text-emerald-500' : 'text-red-400') : (isNeg ? 'text-red-400' : 'text-emerald-500');
  return (
    <Card>
      <CardContent className="pt-5 pb-4 px-4">
        <div className="flex items-center gap-2 text-muted-foreground mb-2">
          <Icon className="h-4 w-4" />
          <span className="text-xs font-medium">{label}</span>
        </div>
        <div className="flex items-end gap-2">
          <span className="text-2xl font-bold text-foreground">{value}</span>
          <span className={`text-xs font-medium ${color} mb-0.5`}>{delta}</span>
        </div>
      </CardContent>
    </Card>
  );
}
