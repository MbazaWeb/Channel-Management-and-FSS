import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { StatCard } from '@/components/dashboard/StatCard';
import { TerritoryLeaderboard } from '@/components/dashboard/TerritoryLeaderboard';
import { FileText, CheckCircle, XCircle, Target, Globe, TrendingUp, Award, PieChartIcon, Users, UserCheck, UserMinus } from 'lucide-react';
import {
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import type { Database } from '@/integrations/supabase/types';

type Zone = Database['public']['Tables']['zones']['Row'];
type Territory = Database['public']['Tables']['territories']['Row'] & { zones?: { name: string } | null };

interface TerritoryData {
  id: string;
  name: string;
  zoneId: string | null;
  zoneName: string;
  target: number;
  actual: number;
  achievement: number;
  pending: number;
  total: number;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--warning))', 'hsl(var(--destructive))', 'hsl(var(--accent))'];

export default function PublicDashboard() {
  const { data: apps = [] } = useQuery({
    queryKey: ['public-applications'],
    queryFn: async () => {
      const { data } = await supabase
        .from('applications')
        .select('status, territory_id, zone_id, created_at, fss_user')
        .order('created_at', { ascending: false });
      return data ?? [];
    },
  });

  const { data: territories = [] } = useQuery({
    queryKey: ['public-territories'],
    queryFn: async () => {
      const { data } = await supabase
        .from('territories')
        .select('*, zones(name)')
        .order('name');
      return data ?? [];
    },
  });

  const { data: zones = [] } = useQuery({
    queryKey: ['public-zones'],
    queryFn: async () => {
      const { data } = await supabase
        .from('zones')
        .select('*')
        .order('name');
      return data ?? [];
    },
  });

  // Calculate statistics
  const total = apps.length;
  const approved = apps.filter(a => a.status === 'approved').length;
  const rejected = apps.filter(a => a.status === 'rejected').length;
  const pending = apps.filter(a => a.status === 'pending').length;
  
  // FSS User statistics
  const fssTotal = apps.filter(a => a.fss_user === true).length;
  const fssActive = apps.filter(a => a.fss_user === true && a.status === 'approved').length;
  const fssInactive = apps.filter(a => a.status === 'approved' && a.fss_user !== true).length;
  
  const approvalRate = total > 0 ? Math.round((approved / total) * 100) : 0;
  const rejectionRate = total > 0 ? Math.round((rejected / total) * 100) : 0;

  // Territory data with performance metrics
  const territoryData: TerritoryData[] = territories
    .map((t) => {
      const actual = apps.filter(a => a.territory_id === t.id && a.status === 'approved').length;
      const target = t.monthly_target || 0;
      const achievement = target > 0 ? Math.round((actual / target) * 100) : actual > 0 ? 100 : 0;
      
      return {
        id: t.id,
        name: t.name,
        zoneId: t.zone_id,
        zoneName: t.zones?.name || 'Unassigned',
        target,
        actual,
        achievement,
        pending: apps.filter(a => a.territory_id === t.id && a.status === 'pending').length,
        total: apps.filter(a => a.territory_id === t.id).length,
      };
    })
    .filter(t => t.target > 0 || t.actual > 0 || t.pending > 0);

  // Zone-level aggregation
  const zoneData = zones.map((z) => {
    const zoneTerritories = territoryData.filter((t) => t.zoneId === z.id);
    const target = zoneTerritories.reduce((s: number, t) => s + t.target, 0);
    const actual = zoneTerritories.reduce((s: number, t) => s + t.actual, 0);
    const pending = zoneTerritories.reduce((s: number, t) => s + t.pending, 0);
    const achievement = target > 0 ? Math.round((actual / target) * 100) : actual > 0 ? 100 : 0;
    
    return {
      id: z.id,
      name: z.name,
      target,
      actual,
      pending,
      achievement,
      territoryCount: zoneTerritories.length,
    };
  });

  // Top performing territories
  const topTerritories = [...territoryData]
    .sort((a, b) => b.achievement - a.achievement)
    .filter(t => t.achievement > 0)
    .slice(0, 5);

  // Status distribution for pie chart
  const statusData = [
    { name: 'Approved', value: approved },
    { name: 'Pending', value: pending },
    { name: 'Rejected', value: rejected },
  ].filter(item => item.value > 0);

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Sales Channel Partner Performance Overview
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <TrendingUp className="h-4 w-4" />
          <span>Last updated: {new Date().toLocaleDateString()}</span>
        </div>
      </div>

      {/* Stats Cards - Removed description prop since StatCard doesn't support it */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard 
          title="Total Applications" 
          value={total} 
          icon={FileText} 
          color="primary"
        />
        <StatCard 
          title="Approved" 
          value={approved} 
          icon={CheckCircle} 
          color="success"
        />
        <StatCard 
          title="Rejected" 
          value={rejected} 
          icon={XCircle} 
          color="destructive"
        />
        <StatCard 
          title="Pending Review" 
          value={pending} 
          icon={Target} 
          color="accent"
        />
        <StatCard 
          title="FSS Total Users" 
          value={fssTotal} 
          icon={Users} 
          color="secondary"
        />
        <StatCard 
          title="FSS Active Users" 
          value={fssActive} 
          icon={UserCheck} 
          color="success"
        />
        <StatCard 
          title="FSS Inactive Users" 
          value={fssInactive} 
          icon={UserMinus} 
          color="accent"
        />
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-lg bg-primary/5 p-3 text-center">
          <p className="text-xs text-muted-foreground">Approval Rate</p>
          <p className="text-xl font-bold text-primary">{approvalRate}%</p>
        </div>
        <div className="rounded-lg bg-destructive/5 p-3 text-center">
          <p className="text-xs text-muted-foreground">Rejection Rate</p>
          <p className="text-xl font-bold text-destructive">{rejectionRate}%</p>
        </div>
        <div className="rounded-lg bg-secondary/5 p-3 text-center">
          <p className="text-xs text-muted-foreground">Active Territories</p>
          <p className="text-xl font-bold text-secondary">{territoryData.length}</p>
        </div>
        <div className="rounded-lg bg-accent/5 p-3 text-center">
          <p className="text-xs text-muted-foreground">Avg Achievement</p>
          <p className="text-xl font-bold text-accent">
            {territoryData.length > 0 
              ? Math.round(territoryData.reduce((acc, t) => acc + t.achievement, 0) / territoryData.length) 
              : 0}%
          </p>
        </div>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="zones">Zones</TabsTrigger>
          <TabsTrigger value="territories">Territories</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          {/* Status Distribution and Top Territories */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Status Distribution Card */}
            <Card className="lg:col-span-1">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <PieChartIcon className="h-4 w-4 text-primary" />
                  Application Status
                </CardTitle>
                <CardDescription>Distribution by status</CardDescription>
              </CardHeader>
              <CardContent>
                {statusData.length > 0 ? (
                  <>
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={statusData}
                            cx="50%"
                            cy="50%"
                            innerRadius={40}
                            outerRadius={70}
                            paddingAngle={2}
                            dataKey="value"
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            labelLine={false}
                          >
                            {statusData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '0.5rem',
                              fontSize: '0.75rem',
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="mt-2 space-y-1">
                      {statusData.map((item, index) => (
                        <div key={item.name} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS[index] }} />
                            <span>{item.name}</span>
                          </div>
                          <span className="font-medium">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">No data available</p>
                )}
              </CardContent>
            </Card>

            {/* Top Territories Card */}
            <Card className="lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Award className="h-4 w-4 text-primary" />
                  Top Performing Territories
                </CardTitle>
                <CardDescription>Based on target achievement</CardDescription>
              </CardHeader>
              <CardContent>
                {topTerritories.length > 0 ? (
                  <div className="space-y-4">
                    {topTerritories.map((t, i) => (
                      <div key={t.id}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-muted-foreground">#{i + 1}</span>
                            <span className="text-sm font-medium">{t.name}</span>
                            <Badge variant="outline" className="text-xs">{t.zoneName}</Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">{t.actual}/{t.target}</span>
                            <Badge 
                              variant={t.achievement >= 100 ? 'default' : t.achievement >= 70 ? 'secondary' : 'outline'}
                              className="text-xs"
                            >
                              {t.achievement}%
                            </Badge>
                          </div>
                        </div>
                        <Progress value={Math.min(t.achievement, 100)} className="h-1.5" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">No territory data available</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Zones Tab */}
        <TabsContent value="zones" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {zoneData.map(zone => (
              <Card key={zone.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-medium flex items-center gap-2">
                    <Globe className="h-4 w-4 text-primary" />
                    {zone.name}
                  </CardTitle>
                  <CardDescription>{zone.territoryCount} Territories</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-muted-foreground">Achievement</span>
                        <span className="font-medium">{zone.achievement}%</span>
                      </div>
                      <Progress value={Math.min(zone.achievement, 100)} className="h-2" />
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div>
                        <p className="text-muted-foreground text-xs">Target</p>
                        <p className="font-medium">{zone.target}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Actual</p>
                        <p className="font-medium">{zone.actual}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Pending</p>
                        <p className="font-medium">{zone.pending}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {zoneData.length === 0 && (
              <div className="col-span-full text-center py-12 text-muted-foreground">
                <Globe className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No zone data available</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Territories Tab */}
        <TabsContent value="territories">
          <TerritoryLeaderboard territories={territoryData} />
        </TabsContent>
      </Tabs>
    </div>
  );
}