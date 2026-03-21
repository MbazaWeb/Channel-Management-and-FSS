import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { Shield, Plus, MapPin, FileText, Check, X, Download, Eye, BarChart3, Globe, ChevronDown, Paperclip, Pencil, Trash2, ArrowLeft, Users, Search, Target, TrendingDown, Calendar, Bell, Clock, Edit } from 'lucide-react';
import { StatCard } from '@/components/dashboard/StatCard';
import { exportApplicationPdf, exportApplicationsListPdf } from '@/lib/exportPdf';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Database } from '@/integrations/supabase/types';

type Zone = Database['public']['Tables']['zones']['Row'];
type Territory = Database['public']['Tables']['territories']['Row'] & { zones?: { name: string } | null };
type Application = Database['public']['Tables']['applications']['Row'] & { territories?: { name: string } | null; zones?: { name: string } | null };
type Attachment = Database['public']['Tables']['application_attachments']['Row'];
type Notification = Database['public']['Tables']['notifications']['Row'] & { applications?: { trading_name: string } | null };

export default function AdminPanel() {
  const { role } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Notifications
  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const { data } = await supabase
        .from('notifications')
        .select('*, applications(trading_name)')
        .order('created_at', { ascending: false })
        .limit(50);
      return (data ?? []) as Notification[];
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('notifications').update({ read: true }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markAllAsRead = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('notifications').update({ read: true }).eq('read', false);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  if (role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
        <Shield className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="font-display font-bold text-xl text-foreground">Access Denied</h2>
        <p className="text-muted-foreground mt-1">Admin access required</p>
      </div>
    );
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'new_application': return <FileText className="h-4 w-4 text-blue-500" />;
      case 'approved': return <Check className="h-4 w-4 text-green-500" />;
      case 'rejected': return <X className="h-4 w-4 text-red-500" />;
      case 'in_progress': return <Clock className="h-4 w-4 text-amber-500" />;
      default: return <Bell className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const formatTimeAgo = (date: string) => {
    const now = new Date();
    const then = new Date(date);
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="h-10 w-10 rounded-lg gradient-primary flex items-center justify-center">
            <Shield className="h-5 w-5 text-primary-foreground" />
          </div>
          <h1 className="text-xl font-display font-bold text-foreground">Admin Panel</h1>
        </div>

        <div className="flex items-center gap-2">
          {/* Global Import Button */}
          <Button variant="outline" size="sm" onClick={() => navigate('/admin/import')} className="gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Global Import</span>
          </Button>

          {/* Active Upload Button */}
          <Button variant="outline" size="sm" onClick={() => navigate('/admin/active')} className="gap-2">
            <TrendingDown className="h-4 w-4" />
            <span className="hidden sm:inline">Active Upload</span>
          </Button>

          {/* Notifications Bell */}
          <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="icon" className="relative">
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center font-medium">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0" align="end">
            <div className="flex items-center justify-between p-3 border-b">
              <h4 className="font-semibold text-sm">Notifications</h4>
              {unreadCount > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-xs h-7"
                  onClick={() => markAllAsRead.mutate()}
                >
                  Mark all as read
                </Button>
              )}
            </div>
            <ScrollArea className="h-[300px]">
              {notifications.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground text-sm">
                  No notifications
                </div>
              ) : (
                <div className="divide-y">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-3 hover:bg-muted/50 cursor-pointer transition-colors ${!notification.read ? 'bg-primary/5' : ''}`}
                      onClick={() => !notification.read && markAsRead.mutate(notification.id)}
                    >
                      <div className="flex gap-3">
                        <div className="mt-0.5">{getNotificationIcon(notification.type)}</div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm ${!notification.read ? 'font-medium' : ''}`}>
                            {notification.title}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">
                            {notification.message}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatTimeAgo(notification.created_at)}
                          </p>
                        </div>
                        {!notification.read && (
                          <div className="h-2 w-2 rounded-full bg-primary mt-1.5" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </PopoverContent>
        </Popover>
        </div>
      </div>

      <Tabs defaultValue="dashboard" className="space-y-4">
        <TabsList className="w-full grid grid-cols-5">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="applications">Applications</TabsTrigger>
          <TabsTrigger value="team-leaders">TL & DSF</TabsTrigger>
          <TabsTrigger value="fss">FSS Users</TabsTrigger>
          <TabsTrigger value="territories">Zones & Territories</TabsTrigger>
        </TabsList>
        <TabsContent value="dashboard"><AdminDashboard /></TabsContent>
        <TabsContent value="applications"><ApplicationsList /></TabsContent>
        <TabsContent value="team-leaders"><TeamLeadersManager /></TabsContent>
        <TabsContent value="fss"><FSSUsersManager /></TabsContent>
        <TabsContent value="territories"><ZonesTerritoriesManager /></TabsContent>
      </Tabs>
    </div>
  );
}

function AdminDashboard() {
  // Date filter state
  const [dateFilter, setDateFilter] = useState<string>('mtd');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [channelFilter, setChannelFilter] = useState<string>('all');

  const { data: apps = [] } = useQuery({
    queryKey: ['admin-applications'],
    queryFn: async () => {
      const { data } = await supabase.from('applications').select('status, territory_id, zone_id, created_at, channel, fss_user').order('created_at', { ascending: false });
      return data ?? [];
    },
  });

  const { data: territories = [] } = useQuery({
    queryKey: ['territories'],
    queryFn: async () => {
      const { data } = await supabase.from('territories').select('*, zones(name)');
      return data ?? [];
    },
  });

  const { data: zones = [] } = useQuery({
    queryKey: ['zones'],
    queryFn: async () => {
      const { data } = await supabase.from('zones').select('*');
      return data ?? [];
    },
  });

  // Calculate date ranges based on filter
  const getDateRange = (filter: string): { start: Date; end: Date; monthCount: number } => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    
    switch (filter) {
      case 'this_month': {
        const start = new Date(currentYear, currentMonth, 1);
        const end = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59);
        return { start, end, monthCount: 1 };
      }
      case 'last_month': {
        const start = new Date(currentYear, currentMonth - 1, 1);
        const end = new Date(currentYear, currentMonth, 0, 23, 59, 59);
        return { start, end, monthCount: 1 };
      }
      case 'mtd': {
        // MTD = from start of year to now (current month count)
        const start = new Date(currentYear, 0, 1);
        const end = now;
        return { start, end, monthCount: currentMonth + 1 };
      }
      case 'custom': {
        if (customStartDate && customEndDate) {
          const start = new Date(customStartDate);
          const end = new Date(customEndDate);
          end.setHours(23, 59, 59);
          // Calculate months between dates
          const diffMonths = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1;
          return { start, end, monthCount: Math.max(1, diffMonths) };
        }
        // Default to this month if no custom dates
        return { start: new Date(currentYear, currentMonth, 1), end: now, monthCount: 1 };
      }
      default:
        return { start: new Date(currentYear, 0, 1), end: now, monthCount: currentMonth + 1 };
    }
  };

  const { start: filterStart, end: filterEnd, monthCount } = getDateRange(dateFilter);

  // Filter apps by date range and channel
  const filteredApps = apps.filter(app => {
    const appDate = new Date(app.created_at);
    const inDateRange = appDate >= filterStart && appDate <= filterEnd;
    
    // Channel filter
    let matchesChannel = true;
    if (channelFilter === 'esp') {
      matchesChannel = app.channel === 'ESP' || !app.channel;
    } else if (channelFilter === 'dsf') {
      matchesChannel = app.channel === 'DSF';
    }
    
    return inDateRange && matchesChannel;
  });

  const total = filteredApps.length;
  const approved = filteredApps.filter(a => a.status === 'approved').length;
  const rejected = filteredApps.filter(a => a.status === 'rejected').length;
  const pending = filteredApps.filter(a => a.status === 'pending').length;
  const inProgress = filteredApps.filter(a => a.status === 'in_progress').length;
  
  // Channel breakdown from filtered apps
  const espCount = filteredApps.filter(a => (a.channel === 'ESP' || !a.channel) && a.status === 'approved').length;
  const dsfCount = filteredApps.filter(a => a.channel === 'DSF' && a.status === 'approved').length;
  const fssCount = filteredApps.filter(a => a.fss_user === true && a.status === 'approved').length;

  // ============ TARGET CALCULATIONS ============
  // Year Target = Sum of all territory year targets (12 months total)
  const totalYearTarget = territories.reduce((s, t) => s + (t.year_target || 0), 0);
  
  // Monthly Target = Year Target / 12
  const monthlyTarget = Math.round(totalYearTarget / 12);
  
  // Period Target = Monthly Target × Number of months in filter period
  // - This Month: monthCount = 1 → Monthly Target × 1
  // - Last Month: monthCount = 1 → Monthly Target × 1  
  // - MTD: monthCount = current month number (e.g., March = 3) → Monthly Target × 3
  // - Custom: monthCount = number of months in date range
  const periodTarget = monthlyTarget * monthCount;
  
  const periodActual = approved;
  const periodGap = periodTarget - periodActual;

  // ============ ZONE PERFORMANCE ============
  const zonePerformance = zones.map((zone) => {
    const zoneTerritories = territories.filter((t) => t.zone_id === zone.id);
    
    // Zone Year Target = Sum of territory year targets in this zone
    const yearTarget = zoneTerritories.reduce((s: number, t) => s + (t.year_target || 0), 0);
    
    // Zone Monthly Target = Zone Year Target / 12
    const zoneMonthlyTarget = Math.round(yearTarget / 12);
    
    // Zone Period Target = Zone Monthly Target × monthCount
    const periodZoneTarget = zoneMonthlyTarget * monthCount;
    
    // Actual = Approved apps in this zone within filter period
    const actual = filteredApps.filter(a => a.zone_id === zone.id && a.status === 'approved').length;
    const gap = periodZoneTarget - actual;
    const pct = periodZoneTarget > 0 ? Math.round((actual / periodZoneTarget) * 100) : actual > 0 ? 100 : 0;
    
    // Channel breakdown per zone
    const zoneApps = filteredApps.filter(a => a.zone_id === zone.id && a.status === 'approved');
    const zoneEsp = zoneApps.filter(a => a.channel === 'ESP' || !a.channel).length;
    const zoneDsf = zoneApps.filter(a => a.channel === 'DSF').length;
    const zoneFss = zoneApps.filter(a => a.fss_user === true).length;
    
    return { 
      ...zone, 
      yearTarget, 
      monthlyTarget: zoneMonthlyTarget,
      periodTarget: periodZoneTarget, 
      actual, 
      gap, 
      pct, 
      territoryCount: zoneTerritories.length, 
      espCount: zoneEsp, 
      dsfCount: zoneDsf, 
      fssCount: zoneFss 
    };
  });

  // ============ TERRITORY PERFORMANCE ============
  const territoryPerformance = territories.map((t) => {
    // Territory Year Target
    const yearTarget = t.year_target || 0;
    
    // Territory Monthly Target = Year Target / 12
    const tMonthlyTarget = Math.round(yearTarget / 12);
    
    // Territory Period Target = Monthly Target × monthCount
    const periodTerritoryTarget = tMonthlyTarget * monthCount;
    
    // Actual = Approved apps in this territory within filter period
    const actual = filteredApps.filter(a => a.territory_id === t.id && a.status === 'approved').length;
    const gap = periodTerritoryTarget - actual;
    const pct = periodTerritoryTarget > 0 ? Math.round((actual / periodTerritoryTarget) * 100) : actual > 0 ? 100 : 0;
    
    // Channel breakdown per territory
    const tApps = filteredApps.filter(a => a.territory_id === t.id && a.status === 'approved');
    const tEsp = tApps.filter(a => a.channel === 'ESP' || !a.channel).length;
    const tDsf = tApps.filter(a => a.channel === 'DSF').length;
    const tFss = tApps.filter(a => a.fss_user === true).length;
    
    return { 
      ...t, 
      yearTarget, 
      monthlyTarget: tMonthlyTarget,
      periodTarget: periodTerritoryTarget, 
      actual, 
      gap, 
      pct, 
      espCount: tEsp, 
      dsfCount: tDsf, 
      fssCount: tFss 
    };
  }).filter(t => t.yearTarget > 0 || t.actual > 0);

  // Get period label for display
  const getPeriodLabel = () => {
    switch (dateFilter) {
      case 'this_month': return 'This Month';
      case 'last_month': return 'Last Month';
      case 'mtd': return `MTD (${monthCount} months)`;
      case 'custom': return customStartDate && customEndDate ? `${customStartDate} to ${customEndDate}` : 'Custom';
      default: return 'Period';
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 p-4 rounded-xl border bg-card shadow-card">
        <div className="flex items-center gap-2">
          <Label className="text-sm font-medium">Period:</Label>
          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="w-[150px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="this_month">This Month</SelectItem>
              <SelectItem value="last_month">Last Month</SelectItem>
              <SelectItem value="mtd">MTD Target</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {dateFilter === 'custom' && (
          <div className="flex items-center gap-2">
            <Input 
              type="date" 
              value={customStartDate} 
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="w-[140px]"
            />
            <span className="text-muted-foreground">to</span>
            <Input 
              type="date" 
              value={customEndDate} 
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="w-[140px]"
            />
          </div>
        )}
        
        <div className="flex items-center gap-2">
          <Label className="text-sm font-medium">Channel:</Label>
          <Select value={channelFilter} onValueChange={setChannelFilter}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="All Channels" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Channels</SelectItem>
              <SelectItem value="esp">ESP Only</SelectItem>
              <SelectItem value="dsf">DSF Only</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard title="Total" value={total} icon={FileText} color="primary" />
        <StatCard title="Pending" value={pending} icon={BarChart3} color="accent" />
        <StatCard title="In Progress" value={inProgress} icon={Clock} color="primary" />
        <StatCard title="Approved" value={approved} icon={Check} color="success" />
        <StatCard title="Rejected" value={rejected} icon={X} color="destructive" />
      </div>

      {/* Channel Breakdown Stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard title="ESP Approved" value={espCount} icon={Shield} color="primary" />
        <StatCard title="DSF Approved" value={dsfCount} icon={FileText} color="secondary" />
        <StatCard title="FSS Users" value={fssCount} icon={Users} color="success" />
      </div>

      {/* Target Summary */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" /> Target Summary - {getPeriodLabel()}
            {channelFilter !== 'all' && <Badge variant="outline" className="ml-2">{channelFilter.toUpperCase()} Only</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground">Year Target</p>
              <p className="text-xl font-bold text-foreground">{totalYearTarget}</p>
              <p className="text-xs text-muted-foreground">12 months</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground">Monthly Target</p>
              <p className="text-xl font-bold text-foreground">{monthlyTarget}</p>
              <p className="text-xs text-muted-foreground">per month</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-primary/5">
              <p className="text-xs text-muted-foreground">Period Target</p>
              <p className="text-xl font-bold text-primary">{periodTarget}</p>
              <p className="text-xs text-muted-foreground">{monthlyTarget} × {monthCount} month{monthCount > 1 ? 's' : ''}</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-success/5">
              <p className="text-xs text-muted-foreground">Period Actual</p>
              <p className="text-xl font-bold text-success">{periodActual}</p>
              <p className="text-xs text-muted-foreground">{periodTarget > 0 ? Math.round((periodActual / periodTarget) * 100) : 0}% achieved</p>
            </div>
            <div className={`text-center p-3 rounded-lg ${periodGap > 0 ? 'bg-destructive/5' : 'bg-success/5'}`}>
              <p className="text-xs text-muted-foreground">Gap</p>
              <p className={`text-xl font-bold ${periodGap > 0 ? 'text-destructive' : 'text-success'}`}>
                {periodGap > 0 ? `-${periodGap}` : `+${Math.abs(periodGap)}`}
              </p>
              <p className="text-xs text-muted-foreground">{periodGap > 0 ? 'Behind target' : 'Ahead of target'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Zone Performance */}
      <div className="space-y-2">
        <h3 className="font-display font-semibold text-foreground flex items-center gap-2">
          <Globe className="h-4 w-4 text-primary" /> Zone Performance - {getPeriodLabel()}
          {channelFilter !== 'all' && <Badge variant="outline" className="ml-2">{channelFilter.toUpperCase()}</Badge>}
        </h3>
        {zonePerformance.map((zone) => (
          <div key={zone.id} className="rounded-xl border bg-card p-4 shadow-card">
            <div className="flex items-center justify-between mb-2">
              <p className="font-medium text-card-foreground">{zone.name}</p>
              <div className="flex items-center gap-3">
                <Badge variant={zone.gap > 0 ? 'destructive' : 'default'} className={zone.gap <= 0 ? 'bg-success' : ''}>
                  {zone.gap > 0 ? `Gap: -${zone.gap}` : `+${Math.abs(zone.gap)}`}
                </Badge>
                <span className="text-xs font-bold text-primary">{zone.pct}%</span>
              </div>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${Math.min(zone.pct, 100)}%` }} />
            </div>
            <div className="flex flex-wrap justify-between text-xs text-muted-foreground mt-1 gap-1">
              <span>Year: {zone.yearTarget} • Monthly: {zone.monthlyTarget} • Period ({monthCount}mo): {zone.periodTarget} • Actual: {zone.actual}</span>
              <span>ESP: {zone.espCount} • DSF: {zone.dsfCount} • FSS: {zone.fssCount}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Territory Performance */}
      {territoryPerformance.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-display font-semibold text-foreground flex items-center gap-2">
            <MapPin className="h-4 w-4 text-secondary" /> Territory Performance - {getPeriodLabel()}
            {channelFilter !== 'all' && <Badge variant="outline" className="ml-2">{channelFilter.toUpperCase()}</Badge>}
          </h3>
          <div className="rounded-xl border bg-card shadow-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Territory</TableHead>
                  <TableHead>Zone</TableHead>
                  <TableHead className="text-right">Year</TableHead>
                  <TableHead className="text-right">Monthly</TableHead>
                  <TableHead className="text-right">Period ({monthCount}mo)</TableHead>
                  <TableHead className="text-right">Actual</TableHead>
                  <TableHead className="text-right">ESP</TableHead>
                  <TableHead className="text-right">DSF</TableHead>
                  <TableHead className="text-right">FSS</TableHead>
                  <TableHead className="text-right">Gap</TableHead>
                  <TableHead className="text-right">%</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {territoryPerformance.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.name}</TableCell>
                    <TableCell>{t.zones?.name || 'N/A'}</TableCell>
                    <TableCell className="text-right">{t.yearTarget}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{t.monthlyTarget}</TableCell>
                    <TableCell className="text-right font-medium text-primary">{t.periodTarget}</TableCell>
                    <TableCell className="text-right">{t.actual}</TableCell>
                    <TableCell className="text-right text-blue-600">{t.espCount}</TableCell>
                    <TableCell className="text-right text-green-600">{t.dsfCount}</TableCell>
                    <TableCell className="text-right text-purple-600">{t.fssCount}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={t.gap > 0 ? 'destructive' : 'default'} className={`text-xs ${t.gap <= 0 ? 'bg-success' : ''}`}>
                        {t.gap > 0 ? `-${t.gap}` : `+${Math.abs(t.gap)}`}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">{t.pct}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}

function ApplicationsList() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [zoneFilter, setZoneFilter] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const { data: apps = [] } = useQuery({
    queryKey: ['admin-applications-full'],
    queryFn: async () => {
      const { data } = await supabase.from('applications').select('*, territories(name), zones(name)').order('created_at', { ascending: false });
      return data ?? [];
    },
  });

  const { data: zones = [] } = useQuery({
    queryKey: ['zones'],
    queryFn: async () => {
      const { data } = await supabase.from('zones').select('*');
      return data ?? [];
    },
  });

  const updateApp = useMutation({
    mutationFn: async ({ id, status }: { id: string; status?: string }) => {
      const updates: Partial<Database['public']['Tables']['applications']['Update']> = {};
      if (status) { updates.status = status; updates.reviewed_by = user?.id; updates.reviewed_at = new Date().toISOString(); }
      const { error } = await supabase.from('applications').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-applications-full'] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const bulkUpdateApps = useMutation({
    mutationFn: async ({ ids, status }: { ids: string[]; status: string }) => {
      const updates: Partial<Database['public']['Tables']['applications']['Update']> = {
        status,
        reviewed_by: user?.id,
        reviewed_at: new Date().toISOString(),
      };
      const { error } = await supabase.from('applications').update(updates).in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-applications-full'] });
      setSelectedIds([]);
      toast.success('Bulk update completed');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Filter applications
  const filteredApps = apps.filter((app) => {
    const matchesSearch =
      search === '' ||
      app.trading_name?.toLowerCase().includes(search.toLowerCase()) ||
      app.contact_person_name?.toLowerCase().includes(search.toLowerCase()) ||
      app.email1?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || app.status === statusFilter;
    const matchesZone = zoneFilter === 'all' || app.zone_id === zoneFilter;
    return matchesSearch && matchesStatus && matchesZone;
  });

  const handleExportAll = async () => {
    await exportApplicationsListPdf(filteredApps.map((a) => ({
      ...a,
      territory_name: a.territories?.name,
      zone_name: a.zones?.name,
    })));
    toast.success('PDF exported');
  };

  const handleExportSingle = async (app: Application) => {
    await exportApplicationPdf({
      ...app,
      territory_name: app.territories?.name,
      zone_name: app.zones?.name,
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredApps.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredApps.map((a) => a.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const actionableSelected = selectedIds.filter((id) => {
    const status = apps.find((a) => a.id === id)?.status;
    return status === 'pending' || status === 'in_progress';
  });

  const statusColors: Record<string, string> = {
    pending: 'bg-warning/10 text-warning border-warning/20',
    in_progress: 'bg-blue-100 text-blue-700 border-blue-200',
    approved: 'bg-success/10 text-success border-success/20',
    rejected: 'bg-destructive/10 text-destructive border-destructive/20',
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="rounded-xl border bg-card p-4 shadow-card">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search name, email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
          <Select value={zoneFilter} onValueChange={setZoneFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by zone" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Zones</SelectItem>
              {zones.map((zone) => (
                <SelectItem key={zone.id} value={zone.id}>{zone.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Bulk Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Checkbox
            checked={selectedIds.length === filteredApps.length && filteredApps.length > 0}
            onCheckedChange={toggleSelectAll}
          />
          <span className="text-sm text-muted-foreground">
            {selectedIds.length > 0 ? `${selectedIds.length} selected` : 'Select all'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {actionableSelected.length > 0 && (
            <>
              <Button
                size="sm"
                variant="outline"
                className="gap-1"
                onClick={() => bulkUpdateApps.mutate({ ids: actionableSelected, status: 'approved' })}
                disabled={bulkUpdateApps.isPending}
              >
                <Check className="h-3 w-3" /> Approve ({actionableSelected.length})
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-1 text-destructive"
                onClick={() => bulkUpdateApps.mutate({ ids: actionableSelected, status: 'rejected' })}
                disabled={bulkUpdateApps.isPending}
              >
                <X className="h-3 w-3" /> Reject ({actionableSelected.length})
              </Button>
            </>
          )}
          <Button variant="outline" size="sm" onClick={handleExportAll} className="gap-1">
            <Download className="h-4 w-4" /> Export PDF
          </Button>
        </div>
      </div>

      {/* Applications List */}
      {filteredApps.map((app) => (
        <div key={app.id} className="rounded-xl border bg-card p-4 shadow-card space-y-3">
          <div className="flex items-start gap-3">
            <Checkbox
              checked={selectedIds.includes(app.id)}
              onCheckedChange={() => toggleSelect(app.id)}
              className="mt-1"
            />
            <div className="flex-1">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-card-foreground">{app.trading_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {app.contact_person_name} {app.contact_person_surname} • {app.email1}
                  </p>
                  {app.zones?.name && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      <Globe className="h-3 w-3 inline mr-1" />{app.zones.name}
                      {app.territories?.name && <> • <MapPin className="h-3 w-3 inline mr-1" />{app.territories.name}</>}
                    </p>
                  )}
                </div>
                <Badge variant="outline" className={statusColors[app.status]}>{app.status}</Badge>
              </div>
              <div className="flex flex-wrap gap-1 mt-2">
                {(app.channel_types as string[] | null)?.map((t: string) => (
                  <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>
                ))}
              </div>
              <div className="flex items-center gap-2 flex-wrap mt-2">
                <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={() => setSelectedApp(app)}>
                  <Eye className="h-3 w-3" /> View
                </Button>
                <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={() => handleExportSingle(app)}>
                  <Download className="h-3 w-3" /> PDF
                </Button>
                {(app.status === 'pending' || app.status === 'in_progress') && (
                  <>
                    <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={() => updateApp.mutate({ id: app.id, status: 'approved' })}>
                      <Check className="h-3 w-3" /> Approve
                    </Button>
                    <Button size="sm" variant="outline" className="h-8 text-xs gap-1 text-destructive" onClick={() => updateApp.mutate({ id: app.id, status: 'rejected' })}>
                      <X className="h-3 w-3" /> Reject
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}

      {filteredApps.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No applications found</p>
        </div>
      )}

      {/* Application Detail Dialog */}
      {selectedApp && (
        <ApplicationDetailDialog app={selectedApp} onClose={() => setSelectedApp(null)} />
      )}
    </div>
  );
}

function ApplicationDetailDialog({ app, onClose }: { app: Application; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  const { data: attachments = [] } = useQuery({
    queryKey: ['attachments', app.id],
    queryFn: async () => {
      const { data } = await supabase.from('application_attachments').select('*').eq('application_id', app.id);
      return data ?? [];
    },
  });

  // Auto-change status to 'in_progress' when viewing a pending application
  useEffect(() => {
    const updateStatusToInProgress = async () => {
      if (app.status === 'pending') {
        const { error } = await supabase
          .from('applications')
          .update({ 
            status: 'in_progress',
            reviewed_by: user?.id,
            reviewed_at: new Date().toISOString()
          })
          .eq('id', app.id);
        
        if (!error) {
          queryClient.invalidateQueries({ queryKey: ['admin-applications-full'] });
          queryClient.invalidateQueries({ queryKey: ['notifications'] });
          toast.info('Application status changed to "In Progress"');
        }
      }
    };
    
    updateStatusToInProgress();
  }, [app.id, app.status, user?.id, queryClient]);

  const getFileUrl = (path: string) => {
    const { data } = supabase.storage.from('application-attachments').getPublicUrl(path);
    return data.publicUrl;
  };

  const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div className="flex justify-between py-1.5 border-b border-muted/50 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xs font-medium text-card-foreground text-right max-w-[60%]">{value || '—'}</span>
    </div>
  );

  return (
    <Dialog open={true} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">{app.trading_name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <h4 className="text-xs font-bold text-primary uppercase tracking-wider mb-1">Business Details</h4>
            <Row label="Trading Name" value={app.trading_name} />
            <Row label="Registration No" value={app.registration_number} />
            <Row label="Citizenship" value={app.citizenship} />
            <Row label="VAT Number" value={app.vat_number} />
            <Row label="Contact Name" value={`${app.contact_person_name} ${app.contact_person_surname}`} />
            <Row label="Date of Birth" value={app.date_of_birth} />
            <Row label="Gender" value={app.gender} />
            <Row label="Credit Check" value={app.credit_check_consent ? 'Yes' : 'No'} />
          </div>

          <div>
            <h4 className="text-xs font-bold text-primary uppercase tracking-wider mb-1">Representative</h4>
            <Row label="Tel (Work)" value={app.telephone_work} />
            <Row label="Tel (Cell)" value={app.telephone_cell} />
            <Row label="Email" value={app.email1} />
            <Row label="Email 2" value={app.email2} />
            <Row label="Physical Address" value={app.physical_address} />
            <Row label="Postal Address" value={app.postal_address} />
            <Row label="Customer No" value={app.customer_number} />
            <Row label="Authority" value={app.authority_to_transact} />
            <Row label="Designation" value={app.designation_capacity} />
          </div>

          <div>
            <h4 className="text-xs font-bold text-primary uppercase tracking-wider mb-1">Zone & Territory</h4>
            <Row label="Zone" value={app.zones?.name} />
            <Row label="Territory" value={app.territories?.name} />
          </div>

          <div>
            <h4 className="text-xs font-bold text-primary uppercase tracking-wider mb-1">Sales Channel</h4>
            <Row label="Types" value={(app.channel_types as string[])?.join(', ')} />
            {app.channel_type_other && <Row label="Other" value={app.channel_type_other} />}
            <Row label="Responsibilities" value={(app.responsibilities as string[])?.join(', ')} />
          </div>

          <div>
            <h4 className="text-xs font-bold text-primary uppercase tracking-wider mb-1">Declaration</h4>
            <Row label="Conflict of Interest" value={app.conflict_of_interest ? 'Yes' : 'No'} />
            {app.conflict_details && <Row label="Details" value={app.conflict_details} />}
            <Row label="Signature" value={app.signature_text} />
            <Row label="Signed at" value={app.signed_at_location} />
            <Row label="Date" value={app.declaration_date} />
            <Row label="Witness 1" value={app.witness1_name} />
            <Row label="Witness 2" value={app.witness2_name} />
          </div>

          {attachments.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-primary uppercase tracking-wider mb-1">Attachments</h4>
              {attachments.map((att) => (
                <div
                  key={att.id}
                  className="flex items-center justify-between gap-2 p-2 rounded-lg hover:bg-muted"
                >
                  <div className="flex items-center gap-2 text-sm text-card-foreground">
                    <Paperclip className="h-3 w-3 text-primary" /> 
                    <span className="truncate max-w-[200px]">{att.file_name}</span>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs"
                      onClick={() => window.open(getFileUrl(att.file_path), '_blank')}
                    >
                      <Eye className="h-3 w-3 mr-1" /> View
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs"
                      asChild
                    >
                      <a href={getFileUrl(att.file_path)} download={att.file_name}>
                        <Download className="h-3 w-3 mr-1" /> Download
                      </a>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button size="sm" variant="outline" className="gap-1" onClick={async () => {
              await exportApplicationPdf({ 
                ...app, 
                territory_name: app.territories?.name, 
                zone_name: app.zones?.name,
                attachments: attachments.map(att => ({
                  id: att.id,
                  file_name: att.file_name,
                  file_path: att.file_path,
                  file_type: att.file_type
                }))
              });
            }}>
              <Download className="h-3 w-3" /> Export PDF
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ZonesTerritoriesManager() {
  const queryClient = useQueryClient();
  const [zoneName, setZoneName] = useState('');
  const [zoneEspTarget, setZoneEspTarget] = useState('');
  const [zoneDsfTarget, setZoneDsfTarget] = useState('');
  const [territoryName, setTerritoryName] = useState('');
  const [selectedZoneId, setSelectedZoneId] = useState('');
  const [espTarget, setEspTarget] = useState('');
  const [dsfTarget, setDsfTarget] = useState('');
  
  // Edit state for territory
  const [editingTerritory, setEditingTerritory] = useState<Territory | null>(null);
  const [editName, setEditName] = useState('');
  const [editZoneId, setEditZoneId] = useState('');
  const [editEspTarget, setEditEspTarget] = useState('');
  const [editDsfTarget, setEditDsfTarget] = useState('');
  
  // Edit state for zone
  const [editingZone, setEditingZone] = useState<string | null>(null);
  const [editZoneName, setEditZoneName] = useState('');
  const [editZoneEspTarget, setEditZoneEspTarget] = useState('');
  const [editZoneDsfTarget, setEditZoneDsfTarget] = useState('');

  // Calculate totals and monthly targets
  const espVal = parseInt(espTarget) || 0;
  const dsfVal = parseInt(dsfTarget) || 0;
  const totalYearTarget = espVal + dsfVal;
  const espMonthly = Math.round(espVal / 12);
  const dsfMonthly = Math.round(dsfVal / 12);
  const totalMonthly = espMonthly + dsfMonthly;
  
  // Edit calculations
  const editEspVal = parseInt(editEspTarget) || 0;
  const editDsfVal = parseInt(editDsfTarget) || 0;
  const editTotalYear = editEspVal + editDsfVal;
  const editEspMonthly = Math.round(editEspVal / 12);
  const editDsfMonthly = Math.round(editDsfVal / 12);
  const editTotalMonthly = editEspMonthly + editDsfMonthly;

  const { data: zones = [] } = useQuery({
    queryKey: ['zones'],
    queryFn: async () => {
      const { data } = await supabase.from('zones').select('*').order('name');
      return data ?? [];
    },
  });

  const { data: territories = [] } = useQuery({
    queryKey: ['territories'],
    queryFn: async () => {
      const { data } = await supabase.from('territories').select('*, zones(name)').order('name');
      return data ?? [];
    },
  });

  const addZone = useMutation({
    mutationFn: async () => {
      if (!zoneName.trim()) throw new Error('Name required');
      const { error } = await supabase.from('zones').insert({ 
        name: zoneName.trim(),
        esp_target: parseInt(zoneEspTarget) || 0,
        dsf_target: parseInt(zoneDsfTarget) || 0
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['zones'] });
      setZoneName('');
      setZoneEspTarget('');
      setZoneDsfTarget('');
      toast.success('Zone created');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateZone = useMutation({
    mutationFn: async () => {
      if (!editingZone || !editZoneName.trim()) throw new Error('Name required');
      const { error } = await supabase.from('zones').update({ 
        name: editZoneName.trim(),
        esp_target: parseInt(editZoneEspTarget) || 0,
        dsf_target: parseInt(editZoneDsfTarget) || 0
      }).eq('id', editingZone);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['zones'] });
      setEditingZone(null);
      toast.success('Zone updated');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addTerritory = useMutation({
    mutationFn: async () => {
      if (!territoryName.trim() || !selectedZoneId) throw new Error('Name and zone required');
      const { error } = await supabase.from('territories').insert({
        name: territoryName.trim(),
        zone_id: selectedZoneId,
        esp_target: espVal,
        dsf_target: dsfVal,
        year_target: totalYearTarget,
        esp_monthly_target: espMonthly,
        dsf_monthly_target: dsfMonthly,
        monthly_target: totalMonthly,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['territories'] });
      setTerritoryName(''); setEspTarget(''); setDsfTarget('');
      toast.success('Territory created');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateTerritory = useMutation({
    mutationFn: async () => {
      if (!editingTerritory || !editName.trim()) throw new Error('Name required');
      const { error } = await supabase.from('territories').update({
        name: editName.trim(),
        zone_id: editZoneId || null,
        esp_target: editEspVal,
        dsf_target: editDsfVal,
        year_target: editTotalYear,
        esp_monthly_target: editEspMonthly,
        dsf_monthly_target: editDsfMonthly,
        monthly_target: editTotalMonthly,
      }).eq('id', editingTerritory.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['territories'] });
      setEditingTerritory(null);
      toast.success('Territory updated');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteTerritory = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('territories').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['territories'] });
      toast.success('Territory deleted');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const startEdit = (t: Territory) => {
    setEditingTerritory(t);
    setEditName(t.name);
    setEditZoneId(t.zone_id || '');
    setEditEspTarget(String(t.esp_target || 0));
    setEditDsfTarget(String(t.dsf_target || 0));
  };

  const cancelEdit = () => {
    setEditingTerritory(null);
    setEditName('');
    setEditZoneId('');
    setEditEspTarget('');
    setEditDsfTarget('');
  };

  return (
    <div className="space-y-6">
      {/* Add Zone */}
      <div className="rounded-xl border bg-card p-4 shadow-card space-y-3">
        <h3 className="font-display font-semibold text-card-foreground flex items-center gap-2">
          <Globe className="h-4 w-4 text-primary" /> New Zone
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
          <Input value={zoneName} onChange={e => setZoneName(e.target.value)} placeholder="Zone name" className="sm:col-span-2" />
          <Input type="number" value={zoneEspTarget} onChange={e => setZoneEspTarget(e.target.value)} placeholder="ESP Target" />
          <Input type="number" value={zoneDsfTarget} onChange={e => setZoneDsfTarget(e.target.value)} placeholder="DSF Target" />
        </div>
        <Button onClick={() => addZone.mutate()} disabled={addZone.isPending} size="sm">
          <Plus className="h-4 w-4 mr-1" /> Add Zone
        </Button>
      </div>

      {/* Add Territory */}
      <div className="rounded-xl border bg-card p-4 shadow-card space-y-3">
        <h3 className="font-display font-semibold text-card-foreground flex items-center gap-2">
          <MapPin className="h-4 w-4 text-primary" /> New Territory
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Zone</Label>
            <Select value={selectedZoneId} onValueChange={setSelectedZoneId}>
              <SelectTrigger><SelectValue placeholder="Select Zone" /></SelectTrigger>
              <SelectContent>
                {zones.map((z) => (
                  <SelectItem key={z.id} value={z.id}>{z.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Territory Name</Label>
            <Input value={territoryName} onChange={e => setTerritoryName(e.target.value)} placeholder="Name" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">ESP Year Target</Label>
            <Input type="number" value={espTarget} onChange={e => setEspTarget(e.target.value)} placeholder="0" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">DSF Year Target</Label>
            <Input type="number" value={dsfTarget} onChange={e => setDsfTarget(e.target.value)} placeholder="0" />
          </div>
        </div>
        {/* Calculated targets display */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-2 bg-muted/50 rounded text-xs">
          <div><span className="text-muted-foreground">Total Year:</span> <span className="font-medium">{totalYearTarget}</span></div>
          <div><span className="text-muted-foreground">ESP Monthly:</span> <span className="font-medium text-blue-600">{espMonthly}</span></div>
          <div><span className="text-muted-foreground">DSF Monthly:</span> <span className="font-medium text-purple-600">{dsfMonthly}</span></div>
          <div><span className="text-muted-foreground">Total Monthly:</span> <span className="font-medium">{totalMonthly}</span></div>
        </div>
        <Button onClick={() => addTerritory.mutate()} disabled={addTerritory.isPending} size="sm">
          Add Territory
        </Button>
      </div>

      {/* List zones with territories */}
      <div className="space-y-3">
        <h3 className="font-display font-semibold text-foreground">All Zones & Territories</h3>
        {zones.map((zone) => {
          const zoneTerritories = territories.filter((t) => t.zone_id === zone.id);
          const isEditing = editingZone === zone.id;
          return (
            <div key={zone.id} className="rounded-xl border bg-card shadow-card overflow-hidden">
              <div className="bg-primary/5 px-4 py-3">
                {isEditing ? (
                  <div className="space-y-2">
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                      <Input value={editZoneName} onChange={e => setEditZoneName(e.target.value)} placeholder="Zone name" className="sm:col-span-2" />
                      <Input type="number" value={editZoneEspTarget} onChange={e => setEditZoneEspTarget(e.target.value)} placeholder="ESP Target" />
                      <Input type="number" value={editZoneDsfTarget} onChange={e => setEditZoneDsfTarget(e.target.value)} placeholder="DSF Target" />
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => updateZone.mutate()} disabled={updateZone.isPending}>
                        <Check className="h-3 w-3 mr-1" /> Save
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingZone(null)}>
                        <X className="h-3 w-3 mr-1" /> Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 flex-wrap">
                    <Globe className="h-4 w-4 text-primary" />
                    <span className="font-medium text-card-foreground">{zone.name}</span>
                    <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700">ESP: {zone.esp_target || 0}</Badge>
                    <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700">DSF: {zone.dsf_target || 0}</Badge>
                    <Badge variant="secondary" className="text-xs ml-auto">{zoneTerritories.length} territories</Badge>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => {
                      setEditingZone(zone.id);
                      setEditZoneName(zone.name);
                      setEditZoneEspTarget(String(zone.esp_target || 0));
                      setEditZoneDsfTarget(String(zone.dsf_target || 0));
                    }}>
                      <Edit className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
              {zoneTerritories.length > 0 && (
                <div className="divide-y">
                  {zoneTerritories.map((t) => (
                    <div key={t.id} className="px-4 py-3">
                      {editingTerritory?.id === t.id ? (
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            <Input value={editName} onChange={e => setEditName(e.target.value)} placeholder="Name" />
                            <Select value={editZoneId} onValueChange={setEditZoneId}>
                              <SelectTrigger><SelectValue placeholder="Zone" /></SelectTrigger>
                              <SelectContent>
                                {zones.map((z) => (
                                  <SelectItem key={z.id} value={z.id}>{z.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <div className="space-y-1">
                              <Label className="text-xs">ESP Year</Label>
                              <Input type="number" value={editEspTarget} onChange={e => setEditEspTarget(e.target.value)} placeholder="ESP" />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">DSF Year</Label>
                              <Input type="number" value={editDsfTarget} onChange={e => setEditDsfTarget(e.target.value)} placeholder="DSF" />
                            </div>
                          </div>
                          <div className="grid grid-cols-4 gap-2 p-2 bg-muted/50 rounded text-xs">
                            <div><span className="text-muted-foreground">Total:</span> <span className="font-medium">{editTotalYear}</span></div>
                            <div><span className="text-muted-foreground">ESP/mo:</span> <span className="font-medium text-blue-600">{editEspMonthly}</span></div>
                            <div><span className="text-muted-foreground">DSF/mo:</span> <span className="font-medium text-purple-600">{editDsfMonthly}</span></div>
                            <div><span className="text-muted-foreground">Total/mo:</span> <span className="font-medium">{editTotalMonthly}</span></div>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => updateTerritory.mutate()} disabled={updateTerritory.isPending}>
                              <Check className="h-3 w-3 mr-1" /> Save
                            </Button>
                            <Button size="sm" variant="outline" onClick={cancelEdit}>
                              <X className="h-3 w-3 mr-1" /> Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div>
                            <p className="text-sm font-medium text-card-foreground flex items-center gap-1.5">
                              <MapPin className="h-3 w-3 text-secondary" /> {t.name}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-xs text-muted-foreground text-right flex flex-wrap gap-x-2">
                              <span><span className="text-blue-600">ESP:</span> {t.esp_target || 0} ({t.esp_monthly_target || 0}/mo)</span>
                              <span><span className="text-purple-600">DSF:</span> {t.dsf_target || 0} ({t.dsf_monthly_target || 0}/mo)</span>
                              <span className="font-medium">Total: {t.year_target || 0} ({t.monthly_target || 0}/mo)</span>
                            </div>
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => startEdit(t)}>
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => deleteTerritory.mutate(t.id)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {/* Unassigned territories */}
        {territories.filter((t) => !t.zone_id).length > 0 && (
          <div className="rounded-xl border bg-card shadow-card overflow-hidden">
            <div className="bg-warning/5 px-4 py-3 flex items-center gap-2">
              <MapPin className="h-4 w-4 text-warning" />
              <span className="font-medium text-card-foreground">Unassigned</span>
            </div>
            <div className="divide-y">
              {territories.filter((t) => !t.zone_id).map((t) => (
                <div key={t.id} className="px-4 py-3">
                  {editingTerritory?.id === t.id ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <Input value={editName} onChange={e => setEditName(e.target.value)} placeholder="Name" />
                        <Select value={editZoneId} onValueChange={setEditZoneId}>
                          <SelectTrigger><SelectValue placeholder="Zone" /></SelectTrigger>
                          <SelectContent>
                            {zones.map((z) => (
                              <SelectItem key={z.id} value={z.id}>{z.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <div className="space-y-1">
                          <Label className="text-xs">ESP Year</Label>
                          <Input type="number" value={editEspTarget} onChange={e => setEditEspTarget(e.target.value)} placeholder="ESP" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">DSF Year</Label>
                          <Input type="number" value={editDsfTarget} onChange={e => setEditDsfTarget(e.target.value)} placeholder="DSF" />
                        </div>
                      </div>
                      <div className="grid grid-cols-4 gap-2 p-2 bg-muted/50 rounded text-xs">
                        <div><span className="text-muted-foreground">Total:</span> <span className="font-medium">{editTotalYear}</span></div>
                        <div><span className="text-muted-foreground">ESP/mo:</span> <span className="font-medium text-blue-600">{editEspMonthly}</span></div>
                        <div><span className="text-muted-foreground">DSF/mo:</span> <span className="font-medium text-purple-600">{editDsfMonthly}</span></div>
                        <div><span className="text-muted-foreground">Total/mo:</span> <span className="font-medium">{editTotalMonthly}</span></div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => updateTerritory.mutate()} disabled={updateTerritory.isPending}>
                          <Check className="h-3 w-3 mr-1" /> Save
                        </Button>
                        <Button size="sm" variant="outline" onClick={cancelEdit}>
                          <X className="h-3 w-3 mr-1" /> Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <p className="text-sm font-medium text-card-foreground">{t.name}</p>
                      <div className="flex items-center gap-3">
                        <div className="text-xs text-muted-foreground text-right flex flex-wrap gap-x-2">
                          <span><span className="text-blue-600">ESP:</span> {t.esp_target || 0} ({t.esp_monthly_target || 0}/mo)</span>
                          <span><span className="text-purple-600">DSF:</span> {t.dsf_target || 0} ({t.dsf_monthly_target || 0}/mo)</span>
                          <span className="font-medium">Total: {t.year_target || 0} ({t.monthly_target || 0}/mo)</span>
                        </div>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => startEdit(t)}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => deleteTerritory.mutate(t.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function FSSUsersManager() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [zoneFilter, setZoneFilter] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const { data: apps = [], isLoading } = useQuery({
    queryKey: ['fss-applications'],
    queryFn: async () => {
      const { data } = await supabase
        .from('applications')
        .select('*, territories(name), zones(name)')
        .eq('status', 'approved')
        .order('trading_name');
      return data ?? [];
    },
  });

  const { data: zones = [] } = useQuery({
    queryKey: ['zones'],
    queryFn: async () => {
      const { data } = await supabase.from('zones').select('*').order('name');
      return data ?? [];
    },
  });

  const updateFSSStatus = useMutation({
    mutationFn: async ({ id, fss_user }: { id: string; fss_user: boolean }) => {
      const { error } = await supabase
        .from('applications')
        .update({ fss_user })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fss-applications'] });
      queryClient.invalidateQueries({ queryKey: ['public-applications'] });
      toast.success('FSS status updated');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const bulkUpdateFSS = useMutation({
    mutationFn: async ({ ids, fss_user }: { ids: string[]; fss_user: boolean }) => {
      const { error } = await supabase
        .from('applications')
        .update({ fss_user })
        .in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fss-applications'] });
      queryClient.invalidateQueries({ queryKey: ['public-applications'] });
      setSelectedIds([]);
      toast.success('Bulk FSS update completed');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filteredApps = apps.filter((app) => {
    const matchesSearch =
      search === '' ||
      app.trading_name?.toLowerCase().includes(search.toLowerCase()) ||
      app.contact_person_name?.toLowerCase().includes(search.toLowerCase());

    const matchesZone = zoneFilter === 'all' || app.zone_id === zoneFilter;

    return matchesSearch && matchesZone;
  });

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredApps.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredApps.map((a) => a.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const getChannelType = (app: Application) => {
    const types: string[] = [];
    if (app.channel_types && Array.isArray(app.channel_types)) {
      types.push(...(app.channel_types as string[]).map((t: string) => t.charAt(0).toUpperCase() + t.slice(1)));
    }
    if (app.channel_type_other) {
      types.push(app.channel_type_other);
    }
    return types.length > 0 ? types.join(', ') : 'N/A';
  };

  const fssCount = apps.filter(a => a.fss_user === true).length;

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard title="Total Approved Channels" value={apps.length} icon={FileText} color="primary" />
        <StatCard title="FSS Users" value={fssCount} icon={Users} color="success" />
      </div>

      {/* Filters */}
      <div className="rounded-xl border bg-card p-4 shadow-card">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search channel name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={zoneFilter} onValueChange={setZoneFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by zone" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Zones</SelectItem>
              {zones.map((zone) => (
                <SelectItem key={zone.id} value={zone.id}>
                  {zone.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Bulk Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Checkbox
            checked={selectedIds.length === filteredApps.length && filteredApps.length > 0}
            onCheckedChange={toggleSelectAll}
          />
          <span className="text-sm text-muted-foreground">
            {selectedIds.length > 0 ? `${selectedIds.length} selected` : 'Select all'}
          </span>
        </div>
        {selectedIds.length > 0 && (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="gap-1"
              onClick={() => bulkUpdateFSS.mutate({ ids: selectedIds, fss_user: true })}
              disabled={bulkUpdateFSS.isPending}
            >
              <Check className="h-3 w-3" /> Enable FSS ({selectedIds.length})
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="gap-1 text-destructive"
              onClick={() => bulkUpdateFSS.mutate({ ids: selectedIds, fss_user: false })}
              disabled={bulkUpdateFSS.isPending}
            >
              <X className="h-3 w-3" /> Disable FSS ({selectedIds.length})
            </Button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card shadow-card overflow-hidden">
        <div className="px-4 py-3 border-b bg-muted/30">
          <h3 className="font-display font-semibold text-card-foreground flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" /> FSS User Management
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Showing {filteredApps.length} of {apps.length} approved channels
          </p>
        </div>
        
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : filteredApps.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No approved channels found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={selectedIds.length === filteredApps.length && filteredApps.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Channel Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Zone</TableHead>
                  <TableHead>Territory</TableHead>
                  <TableHead className="text-center">FSS User</TableHead>
                  <TableHead className="text-center">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredApps.map((app) => (
                  <TableRow key={app.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.includes(app.id)}
                        onCheckedChange={() => toggleSelect(app.id)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      {app.trading_name || `${app.contact_person_name} ${app.contact_person_surname}`}
                    </TableCell>
                    <TableCell>{getChannelType(app)}</TableCell>
                    <TableCell>{app.zones?.name || 'N/A'}</TableCell>
                    <TableCell>{app.territories?.name || 'N/A'}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={app.fss_user ? 'default' : 'secondary'} className={app.fss_user ? 'bg-success' : ''}>
                        {app.fss_user ? 'Yes' : 'No'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Switch
                          checked={app.fss_user ?? false}
                          onCheckedChange={(checked) => updateFSSStatus.mutate({ id: app.id, fss_user: checked })}
                          disabled={updateFSSStatus.isPending}
                        />
                        <span className="text-xs text-muted-foreground">
                          {app.fss_user ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}

// Team Leaders & DSF Management Component
function TeamLeadersManager() {
  const [search, setSearch] = useState('');
  const [zoneFilter, setZoneFilter] = useState('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showTreeDialog, setShowTreeDialog] = useState(false);
  const [selectedTL, setSelectedTL] = useState<string | null>(null);
  const [newTL, setNewTL] = useState({
    name: '',
    zone_id: '',
    territory_id: '',
    cluster: '',
    target_dsf_count: 10,
  });

  const queryClient = useQueryClient();

  const { data: zones = [] } = useQuery({
    queryKey: ['zones'],
    queryFn: async () => {
      const { data } = await supabase.from('zones').select('*').order('name');
      return data ?? [];
    },
  });

  const { data: territories = [] } = useQuery({
    queryKey: ['territories-by-zone-tl', newTL.zone_id],
    queryFn: async () => {
      let q = supabase.from('territories').select('*').order('name');
      if (newTL.zone_id) q = q.eq('zone_id', newTL.zone_id);
      const { data } = await q;
      return data ?? [];
    },
    enabled: true,
  });

  const { data: teamLeaders = [] } = useQuery({
    queryKey: ['team-leaders'],
    queryFn: async () => {
      const { data } = await supabase
        .from('team_leaders')
        .select('*, zones(name), territories(name)')
        .order('created_at', { ascending: false });
      return data ?? [];
    },
  });

  const { data: dsfRecords = [] } = useQuery({
    queryKey: ['dsf-records'],
    queryFn: async () => {
      const { data } = await supabase
        .from('dsf_records')
        .select('*, team_leaders(name), zones(name), territories(name), applications(trading_name, contact_person_name, contact_person_surname)')
        .order('created_at', { ascending: false });
      return data ?? [];
    },
  });

  const { data: dsfApplications = [] } = useQuery({
    queryKey: ['dsf-applications'],
    queryFn: async () => {
      const { data } = await supabase
        .from('applications')
        .select('*, zones(name), territories(name), team_leaders:team_leader_id(name)')
        .eq('channel', 'DSF')
        .order('created_at', { ascending: false });
      return data ?? [];
    },
  });

  const createTL = useMutation({
    mutationFn: async (data: typeof newTL) => {
      const { error } = await supabase.from('team_leaders').insert(data);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-leaders'] });
      setShowCreateDialog(false);
      setNewTL({ name: '', zone_id: '', territory_id: '', cluster: '', target_dsf_count: 10 });
      toast.success('Team Leader created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const deleteTL = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('team_leaders').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-leaders'] });
      toast.success('Team Leader deleted');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Filter team leaders
  const filteredTLs = teamLeaders.filter((tl: Record<string, unknown>) => {
    const matchesSearch = search === '' || 
      (tl.name as string).toLowerCase().includes(search.toLowerCase()) ||
      ((tl.cluster as string) || '').toLowerCase().includes(search.toLowerCase());
    const matchesZone = zoneFilter === 'all' || tl.zone_id === zoneFilter;
    return matchesSearch && matchesZone;
  });

  // Get DSFs for a specific team leader
  const getDSFsForTL = (tlId: string) => {
    return dsfApplications.filter((app: Record<string, unknown>) => app.team_leader_id === tlId);
  };

  const selectedTLData = teamLeaders.find((tl: Record<string, unknown>) => tl.id === selectedTL);

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard title="Team Leaders" value={teamLeaders.length} icon={Users} color="primary" />
        <StatCard title="DSF Applications" value={dsfApplications.length} icon={FileText} color="info" />
        <StatCard title="Active DSF Records" value={dsfRecords.length} icon={Shield} color="success" />
      </div>

      {/* Filters & Actions */}
      <div className="rounded-xl border bg-card p-4 shadow-card">
        <div className="flex flex-col md:flex-row justify-between gap-4">
          <div className="flex flex-1 gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search team leaders..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={zoneFilter} onValueChange={setZoneFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by zone" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Zones</SelectItem>
                {zones.map((zone: Record<string, unknown>) => (
                  <SelectItem key={zone.id as string} value={zone.id as string}>
                    {zone.name as string}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Add Team Leader
          </Button>
        </div>
      </div>

      {/* Team Leaders Table */}
      <div className="rounded-xl border bg-card shadow-card overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Zone</TableHead>
              <TableHead>Territory</TableHead>
              <TableHead>Cluster</TableHead>
              <TableHead className="text-center">Target DSF</TableHead>
              <TableHead className="text-center">Actual DSF</TableHead>
              <TableHead className="text-center">Gap</TableHead>
              <TableHead className="text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTLs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  No team leaders found
                </TableCell>
              </TableRow>
            ) : (
              filteredTLs.map((tl: Record<string, unknown>) => {
                const dsfs = getDSFsForTL(tl.id as string);
                const target = (tl.target_dsf_count as number) || 0;
                const actual = dsfs.length;
                const gap = target - actual;
                return (
                  <TableRow key={tl.id as string}>
                    <TableCell className="font-medium">{tl.name as string}</TableCell>
                    <TableCell>{(tl.zones as Record<string, unknown>)?.name as string || 'N/A'}</TableCell>
                    <TableCell>{(tl.territories as Record<string, unknown>)?.name as string || 'N/A'}</TableCell>
                    <TableCell>{(tl.cluster as string) || 'N/A'}</TableCell>
                    <TableCell className="text-center">{target}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="default" className="bg-success">{actual}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={gap <= 0 ? 'default' : 'destructive'} className={gap <= 0 ? 'bg-success' : ''}>
                        {gap <= 0 ? '✓' : gap}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedTL(tl.id as string);
                            setShowTreeDialog(true);
                          }}
                        >
                          View DSFs
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive"
                          onClick={() => {
                            if (confirm('Delete this Team Leader?')) {
                              deleteTL.mutate(tl.id as string);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* DSF Applications Table */}
      <div className="rounded-xl border bg-card shadow-card overflow-hidden">
        <div className="p-4 border-b bg-muted/50">
          <h3 className="font-semibold">DSF Applications</h3>
          <p className="text-sm text-muted-foreground">All applications submitted under DSF channel</p>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>D Number</TableHead>
              <TableHead>Team Leader</TableHead>
              <TableHead>Zone</TableHead>
              <TableHead>Territory</TableHead>
              <TableHead className="text-center">FSS User</TableHead>
              <TableHead className="text-center">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {dsfApplications.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No DSF applications found
                </TableCell>
              </TableRow>
            ) : (
              dsfApplications.map((app: Record<string, unknown>) => (
                <TableRow key={app.id as string}>
                  <TableCell className="font-medium">
                    {(app.trading_name as string) || `${app.contact_person_name} ${app.contact_person_surname}`}
                  </TableCell>
                  <TableCell>{(app.dsf_d_number as string) || 'N/A'}</TableCell>
                  <TableCell>{(app.team_leaders as Record<string, unknown>)?.name as string || 'N/A'}</TableCell>
                  <TableCell>{(app.zones as Record<string, unknown>)?.name as string || 'N/A'}</TableCell>
                  <TableCell>{(app.territories as Record<string, unknown>)?.name as string || 'N/A'}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant={app.dsf_fss_user ? 'default' : 'secondary'} className={app.dsf_fss_user ? 'bg-success' : ''}>
                      {app.dsf_fss_user ? 'Yes' : 'No'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge 
                      variant={app.status === 'approved' ? 'default' : app.status === 'rejected' ? 'destructive' : 'secondary'}
                      className={app.status === 'approved' ? 'bg-success' : ''}
                    >
                      {app.status as string}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create Team Leader Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Team Leader</DialogTitle>
            <DialogDescription>Enter the details for the new team leader</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label>Name *</Label>
              <Input
                value={newTL.name}
                onChange={(e) => setNewTL({ ...newTL, name: e.target.value })}
                placeholder="Team Leader Name"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Zone *</Label>
                <Select 
                  value={newTL.zone_id} 
                  onValueChange={(v) => setNewTL({ ...newTL, zone_id: v, territory_id: '' })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select zone" />
                  </SelectTrigger>
                  <SelectContent>
                    {zones.map((zone: Record<string, unknown>) => (
                      <SelectItem key={zone.id as string} value={zone.id as string}>
                        {zone.name as string}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Territory *</Label>
                <Select 
                  value={newTL.territory_id} 
                  onValueChange={(v) => setNewTL({ ...newTL, territory_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select territory" />
                  </SelectTrigger>
                  <SelectContent>
                    {territories.map((t: Record<string, unknown>) => (
                      <SelectItem key={t.id as string} value={t.id as string}>
                        {t.name as string}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Cluster</Label>
                <Input
                  value={newTL.cluster}
                  onChange={(e) => setNewTL({ ...newTL, cluster: e.target.value })}
                  placeholder="e.g., Cluster A"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Target DSF Count</Label>
                <Input
                  type="number"
                  value={newTL.target_dsf_count}
                  onChange={(e) => setNewTL({ ...newTL, target_dsf_count: parseInt(e.target.value) || 0 })}
                  min={0}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
            <Button 
              onClick={() => createTL.mutate(newTL)}
              disabled={!newTL.name || !newTL.zone_id || !newTL.territory_id || createTL.isPending}
            >
              {createTL.isPending ? 'Creating...' : 'Create Team Leader'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* TL Tree View Dialog */}
      <Dialog open={showTreeDialog} onOpenChange={setShowTreeDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Team Leader Tree View</DialogTitle>
            <DialogDescription>
              {selectedTLData ? `DSF members under ${(selectedTLData as Record<string, unknown>).name}` : 'DSF members'}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {selectedTL && (
              <div className="space-y-4">
                {/* TL Info Card */}
                <div className="rounded-lg border p-4 bg-primary/5">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-primary flex items-center justify-center">
                      <Users className="h-6 w-6 text-primary-foreground" />
                    </div>
                    <div>
                      <h4 className="font-semibold">{(selectedTLData as Record<string, unknown>)?.name as string}</h4>
                      <p className="text-sm text-muted-foreground">
                        {((selectedTLData as Record<string, unknown>)?.zones as Record<string, unknown>)?.name as string} → {((selectedTLData as Record<string, unknown>)?.territories as Record<string, unknown>)?.name as string}
                        {(selectedTLData as Record<string, unknown>)?.cluster && ` (${(selectedTLData as Record<string, unknown>)?.cluster})`}
                      </p>
                    </div>
                  </div>
                </div>

                {/* DSF List */}
                <div className="space-y-2">
                  <h5 className="text-sm font-medium text-muted-foreground">
                    DSF Members ({getDSFsForTL(selectedTL).length} / {(selectedTLData as Record<string, unknown>)?.target_dsf_count || 0})
                  </h5>
                  <div className="max-h-[300px] overflow-y-auto space-y-2">
                    {getDSFsForTL(selectedTL).length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        No DSF members assigned yet
                      </div>
                    ) : (
                      getDSFsForTL(selectedTL).map((dsf: Record<string, unknown>) => (
                        <div key={dsf.id as string} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                              <FileText className="h-4 w-4" />
                            </div>
                            <div>
                              <span className="font-medium">
                                {(dsf.trading_name as string) || `${dsf.contact_person_name} ${dsf.contact_person_surname}`}
                              </span>
                              <p className="text-xs text-muted-foreground">D#: {(dsf.dsf_d_number as string) || 'N/A'}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={dsf.dsf_fss_user ? 'default' : 'secondary'} className={dsf.dsf_fss_user ? 'bg-success text-xs' : 'text-xs'}>
                              {dsf.dsf_fss_user ? 'FSS' : 'Non-FSS'}
                            </Badge>
                            <Badge 
                              variant={dsf.status === 'approved' ? 'default' : 'secondary'}
                              className={dsf.status === 'approved' ? 'bg-success text-xs' : 'text-xs'}
                            >
                              {dsf.status as string}
                            </Badge>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTreeDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
