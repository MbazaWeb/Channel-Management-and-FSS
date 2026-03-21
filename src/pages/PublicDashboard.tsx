import { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { StatCard } from '@/components/dashboard/StatCard';
import { TerritoryLeaderboard } from '@/components/dashboard/TerritoryLeaderboard';
import { FileText, CheckCircle, XCircle, Target, Globe, TrendingUp, Award, PieChartIcon, Users, UserCheck, UserMinus, Calendar, Shield } from 'lucide-react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
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
  espCount: number;
  espActive: number;
  dsfCount: number;
  dsfActive: number;
  fssCount: number;
  activeCount: number;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--warning))', 'hsl(var(--destructive))', 'hsl(var(--accent))'];

export default function PublicDashboard() {
  const { data: apps = [] } = useQuery({
    queryKey: ['public-applications'],
    queryFn: async () => {
      const { data } = await supabase
        .from('applications')
        .select('status, territory_id, zone_id, created_at, fss_user, channel, is_active, source')
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

  const { data: teamLeaders = [] } = useQuery({
    queryKey: ['public-team-leaders'],
    queryFn: async () => {
      const { data } = await supabase
        .from('team_leaders')
        .select('*, zones(name), territories(name)')
        .order('name');
      return data ?? [];
    },
  });

  // Date filter state
  const [dateFilter, setDateFilter] = useState<string>('ytd');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');

  // Calculate date ranges
  const getDateRange = useCallback((filter: string): { start: Date; end: Date } => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    
    switch (filter) {
      case 'this_month': {
        const start = new Date(currentYear, currentMonth, 1);
        const end = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59);
        return { start, end };
      }
      case 'last_month': {
        const start = new Date(currentYear, currentMonth - 1, 1);
        const end = new Date(currentYear, currentMonth, 0, 23, 59, 59);
        return { start, end };
      }
      case 'ytd': {
        const start = new Date(currentYear, 0, 1);
        const end = now;
        return { start, end };
      }
      case 'custom': {
        const start = customStartDate ? new Date(customStartDate) : new Date(currentYear, 0, 1);
        const end = customEndDate ? new Date(customEndDate + 'T23:59:59') : now;
        return { start, end };
      }
      default:
        return { start: new Date(currentYear, 0, 1), end: now };
    }
  }, [customStartDate, customEndDate]);

  // Filter apps by date
  const filteredApps = useMemo(() => {
    const { start, end } = getDateRange(dateFilter);
    return apps.filter(app => {
      const appDate = new Date(app.created_at);
      return appDate >= start && appDate <= end;
    });
  }, [apps, dateFilter, getDateRange]);

  // Calculate statistics using filtered apps
  const total = filteredApps.length;
  const approved = filteredApps.filter(a => a.status === 'approved').length;
  const rejected = filteredApps.filter(a => a.status === 'rejected').length;
  const pending = filteredApps.filter(a => a.status === 'pending').length;
  const inProgress = filteredApps.filter(a => a.status === 'in_progress').length;
  
  // FSS User statistics
  const fssTotal = filteredApps.filter(a => a.fss_user === true).length;
  const fssActive = filteredApps.filter(a => a.fss_user === true && a.status === 'approved').length;
  const fssInactive = filteredApps.filter(a => a.status === 'approved' && a.fss_user !== true).length;
  
  // Channel statistics (ESP vs DSF)
  const espTotal = filteredApps.filter(a => a.channel === 'ESP' || !a.channel).length;
  const espApproved = filteredApps.filter(a => (a.channel === 'ESP' || !a.channel) && a.status === 'approved').length;
  const espActive = filteredApps.filter(a => (a.channel === 'ESP' || !a.channel) && a.is_active).length;
  const dsfTotal = filteredApps.filter(a => a.channel === 'DSF').length;
  const dsfApproved = filteredApps.filter(a => a.channel === 'DSF' && a.status === 'approved').length;
  const dsfActive = filteredApps.filter(a => a.channel === 'DSF' && a.is_active).length;
  const tlCount = teamLeaders.length;
  
  // Active channel statistics
  const totalActive = filteredApps.filter(a => a.is_active).length;
  const espPerformance = espApproved > 0 ? Math.round((espActive / espApproved) * 100) : 0;
  const dsfPerformance = dsfApproved > 0 ? Math.round((dsfActive / dsfApproved) * 100) : 0;
  
  const approvalRate = total > 0 ? Math.round((approved / total) * 100) : 0;
  const rejectionRate = total > 0 ? Math.round((rejected / total) * 100) : 0;

  // Territory data with performance metrics
  const territoryData: TerritoryData[] = territories
    .map((t) => {
      const territoryApps = filteredApps.filter(a => a.territory_id === t.id);
      // NEW RECRUITMENTS ONLY for target achievement (source = 'application' or not set)
      const newRecruitments = territoryApps.filter(a => a.status === 'approved' && (a.source === 'application' || !a.source));
      const actual = newRecruitments.length;
      const target = t.monthly_target || 0;
      const achievement = target > 0 ? Math.round((actual / target) * 100) : actual > 0 ? 100 : 0;
      
      // Total approved (including imports) for base count
      const totalApproved = territoryApps.filter(a => a.status === 'approved').length;
      
      // Channel breakdown (total base including imports)
      const espCount = territoryApps.filter(a => (a.channel === 'ESP' || !a.channel) && a.status === 'approved').length;
      const espActive = territoryApps.filter(a => (a.channel === 'ESP' || !a.channel) && a.is_active).length;
      const dsfCount = territoryApps.filter(a => a.channel === 'DSF' && a.status === 'approved').length;
      const dsfActive = territoryApps.filter(a => a.channel === 'DSF' && a.is_active).length;
      const fssCount = territoryApps.filter(a => a.fss_user === true && a.status === 'approved').length;
      const activeCount = territoryApps.filter(a => a.is_active).length;
      
      return {
        id: t.id,
        name: t.name,
        zoneId: t.zone_id,
        zoneName: t.zones?.name || 'Unassigned',
        target,
        actual,
        achievement,
        pending: territoryApps.filter(a => a.status === 'pending').length,
        total: territoryApps.length,
        espCount,
        espActive,
        dsfCount,
        dsfActive,
        fssCount,
        activeCount,
      };
    })
    .filter(t => t.target > 0 || t.actual > 0 || t.pending > 0);

  // Zone-level aggregation
  const zoneData = zones.map((z) => {
    const zoneTerritories = territoryData.filter((t) => t.zoneId === z.id);
    const zoneApps = filteredApps.filter(a => a.zone_id === z.id);
    const target = zoneTerritories.reduce((s: number, t) => s + t.target, 0);
    const actual = zoneTerritories.reduce((s: number, t) => s + t.actual, 0);
    const pending = zoneTerritories.reduce((s: number, t) => s + t.pending, 0);
    const achievement = target > 0 ? Math.round((actual / target) * 100) : actual > 0 ? 100 : 0;
    
    // Channel breakdown for zone
    const espCount = zoneApps.filter(a => (a.channel === 'ESP' || !a.channel) && a.status === 'approved').length;
    const espActive = zoneApps.filter(a => (a.channel === 'ESP' || !a.channel) && a.is_active).length;
    const dsfCount = zoneApps.filter(a => a.channel === 'DSF' && a.status === 'approved').length;
    const dsfActive = zoneApps.filter(a => a.channel === 'DSF' && a.is_active).length;
    const fssCount = zoneApps.filter(a => a.fss_user === true && a.status === 'approved').length;
    const activeCount = zoneApps.filter(a => a.is_active).length;
    
    return {
      id: z.id,
      name: z.name,
      target,
      actual,
      pending,
      achievement,
      territoryCount: zoneTerritories.length,
      espCount,
      espActive,
      dsfCount,
      dsfActive,
      fssCount,
      activeCount,
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
    { name: 'In Progress', value: inProgress },
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
        <div className="flex items-center gap-3">
          {/* Date Filter */}
          <div className="flex items-center gap-2">
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-[160px]">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="this_month">This Month</SelectItem>
                <SelectItem value="last_month">Last Month</SelectItem>
                <SelectItem value="ytd">Year to Date</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>
            
            {dateFilter === 'custom' && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Calendar className="h-4 w-4" />
                    {customStartDate && customEndDate 
                      ? `${customStartDate} - ${customEndDate}`
                      : 'Set dates'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80" align="end">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Start Date</Label>
                      <Input 
                        type="date" 
                        value={customStartDate} 
                        onChange={(e) => setCustomStartDate(e.target.value)} 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>End Date</Label>
                      <Input 
                        type="date" 
                        value={customEndDate} 
                        onChange={(e) => setCustomEndDate(e.target.value)} 
                      />
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            )}
          </div>
          
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <TrendingUp className="h-4 w-4" />
            <span>Last updated: {new Date().toLocaleDateString()}</span>
          </div>
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

      {/* Channel Stats Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-6">
        <StatCard 
          title="ESP Total" 
          value={espTotal} 
          icon={Shield} 
          color="primary"
        />
        <StatCard 
          title="ESP Approved" 
          value={espApproved} 
          icon={CheckCircle} 
          color="success"
        />
        <StatCard 
          title="ESP Active" 
          value={espActive} 
          icon={TrendingUp} 
          color="info"
        />
        <StatCard 
          title="DSF Total" 
          value={dsfTotal} 
          icon={FileText} 
          color="secondary"
        />
        <StatCard 
          title="DSF Approved" 
          value={dsfApproved} 
          icon={CheckCircle} 
          color="success"
        />
        <StatCard 
          title="DSF Active" 
          value={dsfActive} 
          icon={TrendingUp} 
          color="info"
        />
      </div>

      {/* Performance Summary Row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="rounded-lg bg-green-500/5 p-3 text-center border border-green-500/10">
          <p className="text-xs text-muted-foreground">Total Active</p>
          <p className="text-xl font-bold text-green-600">{totalActive}</p>
          <p className="text-xs text-muted-foreground">{approved > 0 ? Math.round((totalActive / approved) * 100) : 0}% of approved</p>
        </div>
        <div className="rounded-lg bg-blue-500/5 p-3 text-center border border-blue-500/10">
          <p className="text-xs text-muted-foreground">ESP Performance</p>
          <p className="text-xl font-bold text-blue-600">{espPerformance}%</p>
          <p className="text-xs text-muted-foreground">{espActive} of {espApproved} active</p>
        </div>
        <div className="rounded-lg bg-purple-500/5 p-3 text-center border border-purple-500/10">
          <p className="text-xs text-muted-foreground">DSF Performance</p>
          <p className="text-xl font-bold text-purple-600">{dsfPerformance}%</p>
          <p className="text-xs text-muted-foreground">{dsfActive} of {dsfApproved} active</p>
        </div>
        <div className="rounded-lg bg-primary/5 p-3 text-center border border-primary/10">
          <p className="text-xs text-muted-foreground">Team Leaders</p>
          <p className="text-xl font-bold text-primary">{tlCount}</p>
        </div>
        <div className="rounded-lg bg-accent/5 p-3 text-center border border-accent/10">
          <p className="text-xs text-muted-foreground">Active Territories</p>
          <p className="text-xl font-bold text-accent">{territoryData.length}</p>
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
                    {/* Channel breakdown */}
                    <div className="border-t pt-2 mt-2">
                      <p className="text-xs text-muted-foreground mb-2">Channel Breakdown (Active / Total)</p>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div className="rounded bg-blue-50 dark:bg-blue-950/30 p-1.5 text-center">
                          <p className="text-muted-foreground">ESP</p>
                          <p className="font-semibold text-blue-600">{zone.espActive} / {zone.espCount}</p>
                          <p className="text-xs text-muted-foreground">{zone.espCount > 0 ? Math.round((zone.espActive / zone.espCount) * 100) : 0}%</p>
                        </div>
                        <div className="rounded bg-purple-50 dark:bg-purple-950/30 p-1.5 text-center">
                          <p className="text-muted-foreground">DSF</p>
                          <p className="font-semibold text-purple-600">{zone.dsfActive} / {zone.dsfCount}</p>
                          <p className="text-xs text-muted-foreground">{zone.dsfCount > 0 ? Math.round((zone.dsfActive / zone.dsfCount) * 100) : 0}%</p>
                        </div>
                        <div className="rounded bg-green-50 dark:bg-green-950/30 p-1.5 text-center">
                          <p className="text-muted-foreground">Active</p>
                          <p className="font-semibold text-green-600">{zone.activeCount}</p>
                          <p className="text-xs text-muted-foreground">Total</p>
                        </div>
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