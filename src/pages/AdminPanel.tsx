import { useState } from 'react';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Shield, Plus, MapPin, FileText, Check, X, Download, Eye, BarChart3, Globe, ChevronDown, Paperclip, Pencil, Trash2, ArrowLeft, Users, Search, Target, TrendingDown, Calendar } from 'lucide-react';
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

export default function AdminPanel() {
  const { role } = useAuth();
  const navigate = useNavigate();

  if (role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
        <Shield className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="font-display font-bold text-xl text-foreground">Access Denied</h2>
        <p className="text-muted-foreground mt-1">Admin access required</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="h-8 w-8">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="h-10 w-10 rounded-lg gradient-primary flex items-center justify-center">
          <Shield className="h-5 w-5 text-primary-foreground" />
        </div>
        <h1 className="text-xl font-display font-bold text-foreground">Admin Panel</h1>
      </div>

      <Tabs defaultValue="dashboard" className="space-y-4">
        <TabsList className="w-full grid grid-cols-4">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="applications">Applications</TabsTrigger>
          <TabsTrigger value="fss">FSS Users</TabsTrigger>
          <TabsTrigger value="territories">Zones & Territories</TabsTrigger>
        </TabsList>
        <TabsContent value="dashboard"><AdminDashboard /></TabsContent>
        <TabsContent value="applications"><ApplicationsList /></TabsContent>
        <TabsContent value="fss"><FSSUsersManager /></TabsContent>
        <TabsContent value="territories"><ZonesTerritoriesManager /></TabsContent>
      </Tabs>
    </div>
  );
}

function AdminDashboard() {
  const { data: apps = [] } = useQuery({
    queryKey: ['admin-applications'],
    queryFn: async () => {
      const { data } = await supabase.from('applications').select('status, territory_id, zone_id, created_at').order('created_at', { ascending: false });
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

  const total = apps.length;
  const approved = apps.filter(a => a.status === 'approved').length;
  const rejected = apps.filter(a => a.status === 'rejected').length;
  const pending = apps.filter(a => a.status === 'pending').length;

  // Calculate current month (1-12) for MTD
  const currentMonth = new Date().getMonth() + 1; // January = 1

  // Calculate Year Target, MTD Target, and Gap
  const totalYearTarget = territories.reduce((s, t) => s + (t.year_target || 0), 0);
  const totalMtdTarget = Math.round((totalYearTarget / 12) * currentMonth);
  const totalMtdActual = approved;
  const totalGap = totalMtdTarget - totalMtdActual;

  // Zone-level performance with MTD
  const zonePerformance = zones.map((zone) => {
    const zoneTerritories = territories.filter((t) => t.zone_id === zone.id);
    const yearTarget = zoneTerritories.reduce((s: number, t) => s + (t.year_target || 0), 0);
    const mtdTarget = Math.round((yearTarget / 12) * currentMonth);
    const actual = apps.filter(a => a.zone_id === zone.id && a.status === 'approved').length;
    const gap = mtdTarget - actual;
    const pct = mtdTarget > 0 ? Math.round((actual / mtdTarget) * 100) : actual > 0 ? 100 : 0;
    return { ...zone, yearTarget, mtdTarget, actual, gap, pct, territoryCount: zoneTerritories.length };
  });

  // Territory-level performance with MTD
  const territoryPerformance = territories.map((t) => {
    const yearTarget = t.year_target || 0;
    const mtdTarget = Math.round((yearTarget / 12) * currentMonth);
    const actual = apps.filter(a => a.territory_id === t.id && a.status === 'approved').length;
    const gap = mtdTarget - actual;
    const pct = mtdTarget > 0 ? Math.round((actual / mtdTarget) * 100) : actual > 0 ? 100 : 0;
    return { ...t, yearTarget, mtdTarget, actual, gap, pct };
  }).filter(t => t.yearTarget > 0 || t.actual > 0);

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard title="Total" value={total} icon={FileText} color="primary" />
        <StatCard title="Approved" value={approved} icon={Check} color="success" />
        <StatCard title="Rejected" value={rejected} icon={X} color="destructive" />
        <StatCard title="Pending" value={pending} icon={BarChart3} color="accent" />
      </div>

      {/* Year Target Summary */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" /> Target Summary (MTD - {currentMonth} months)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 rounded-lg bg-primary/5">
              <p className="text-xs text-muted-foreground">Year Target</p>
              <p className="text-2xl font-bold text-primary">{totalYearTarget}</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-success/5">
              <p className="text-xs text-muted-foreground">MTD Actual</p>
              <p className="text-2xl font-bold text-success">{totalMtdActual}</p>
              <p className="text-xs text-muted-foreground">of {totalMtdTarget} MTD target</p>
            </div>
            <div className={`text-center p-3 rounded-lg ${totalGap > 0 ? 'bg-destructive/5' : 'bg-success/5'}`}>
              <p className="text-xs text-muted-foreground">Gap</p>
              <p className={`text-2xl font-bold ${totalGap > 0 ? 'text-destructive' : 'text-success'}`}>
                {totalGap > 0 ? `-${totalGap}` : `+${Math.abs(totalGap)}`}
              </p>
              <p className="text-xs text-muted-foreground">{totalGap > 0 ? 'Behind target' : 'Ahead of target'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Zone Performance with Gap */}
      <div className="space-y-2">
        <h3 className="font-display font-semibold text-foreground flex items-center gap-2">
          <Globe className="h-4 w-4 text-primary" /> Zone Performance vs Target
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
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>YTD: {zone.yearTarget} • MTD Target: {zone.mtdTarget}</span>
              <span>Actual: {zone.actual} • {zone.territoryCount} territories</span>
            </div>
          </div>
        ))}
      </div>

      {/* Territory Performance with Gap */}
      {territoryPerformance.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-display font-semibold text-foreground flex items-center gap-2">
            <MapPin className="h-4 w-4 text-secondary" /> Territory Performance vs Target
          </h3>
          <div className="rounded-xl border bg-card shadow-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Territory</TableHead>
                  <TableHead>Zone</TableHead>
                  <TableHead className="text-right">Year Target</TableHead>
                  <TableHead className="text-right">MTD Target</TableHead>
                  <TableHead className="text-right">Actual</TableHead>
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
                    <TableCell className="text-right">{t.mtdTarget}</TableCell>
                    <TableCell className="text-right">{t.actual}</TableCell>
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

  const pendingSelected = selectedIds.filter((id) => 
    apps.find((a) => a.id === id)?.status === 'pending'
  );

  const statusColors: Record<string, string> = {
    pending: 'bg-warning/10 text-warning border-warning/20',
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
          {pendingSelected.length > 0 && (
            <>
              <Button
                size="sm"
                variant="outline"
                className="gap-1"
                onClick={() => bulkUpdateApps.mutate({ ids: pendingSelected, status: 'approved' })}
                disabled={bulkUpdateApps.isPending}
              >
                <Check className="h-3 w-3" /> Approve ({pendingSelected.length})
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-1 text-destructive"
                onClick={() => bulkUpdateApps.mutate({ ids: pendingSelected, status: 'rejected' })}
                disabled={bulkUpdateApps.isPending}
              >
                <X className="h-3 w-3" /> Reject ({pendingSelected.length})
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
                {app.status === 'pending' && (
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
  const { data: attachments = [] } = useQuery({
    queryKey: ['attachments', app.id],
    queryFn: async () => {
      const { data } = await supabase.from('application_attachments').select('*').eq('application_id', app.id);
      return data ?? [];
    },
  });

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
  const [territoryName, setTerritoryName] = useState('');
  const [selectedZoneId, setSelectedZoneId] = useState('');
  const [yearTarget, setYearTarget] = useState('');
  
  // Edit state
  const [editingTerritory, setEditingTerritory] = useState<Territory | null>(null);
  const [editName, setEditName] = useState('');
  const [editZoneId, setEditZoneId] = useState('');
  const [editYearTarget, setEditYearTarget] = useState('');

  // Calculate monthly from year target
  const calculatedMonthly = yearTarget ? Math.round(parseInt(yearTarget) / 12) : 0;
  const editCalculatedMonthly = editYearTarget ? Math.round(parseInt(editYearTarget) / 12) : 0;

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
      const { error } = await supabase.from('zones').insert({ name: zoneName.trim() });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['zones'] });
      setZoneName('');
      toast.success('Zone created');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addTerritory = useMutation({
    mutationFn: async () => {
      if (!territoryName.trim() || !selectedZoneId) throw new Error('Name and zone required');
      const yearTargetVal = parseInt(yearTarget) || 0;
      const { error } = await supabase.from('territories').insert({
        name: territoryName.trim(),
        zone_id: selectedZoneId,
        year_target: yearTargetVal,
        monthly_target: Math.round(yearTargetVal / 12),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['territories'] });
      setTerritoryName(''); setYearTarget('');
      toast.success('Territory created');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateTerritory = useMutation({
    mutationFn: async () => {
      if (!editingTerritory || !editName.trim()) throw new Error('Name required');
      const yearTargetVal = parseInt(editYearTarget) || 0;
      const { error } = await supabase.from('territories').update({
        name: editName.trim(),
        zone_id: editZoneId || null,
        year_target: yearTargetVal,
        monthly_target: Math.round(yearTargetVal / 12),
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
    setEditYearTarget(String(t.year_target || 0));
  };

  const cancelEdit = () => {
    setEditingTerritory(null);
    setEditName('');
    setEditZoneId('');
    setEditYearTarget('');
  };

  return (
    <div className="space-y-6">
      {/* Add Zone */}
      <div className="rounded-xl border bg-card p-4 shadow-card space-y-3">
        <h3 className="font-display font-semibold text-card-foreground flex items-center gap-2">
          <Globe className="h-4 w-4 text-primary" /> New Zone
        </h3>
        <div className="flex gap-2">
          <Input value={zoneName} onChange={e => setZoneName(e.target.value)} placeholder="Zone name" className="flex-1" />
          <Button onClick={() => addZone.mutate()} disabled={addZone.isPending} size="sm">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Add Territory */}
      <div className="rounded-xl border bg-card p-4 shadow-card space-y-3">
        <h3 className="font-display font-semibold text-card-foreground flex items-center gap-2">
          <MapPin className="h-4 w-4 text-primary" /> New Territory
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
            <Label className="text-xs">Year Target</Label>
            <Input type="number" value={yearTarget} onChange={e => setYearTarget(e.target.value)} placeholder="0" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Monthly Target (Auto)</Label>
            <Input type="number" value={calculatedMonthly} disabled className="bg-muted" />
          </div>
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
          return (
            <div key={zone.id} className="rounded-xl border bg-card shadow-card overflow-hidden">
              <div className="bg-primary/5 px-4 py-3 flex items-center gap-2">
                <Globe className="h-4 w-4 text-primary" />
                <span className="font-medium text-card-foreground">{zone.name}</span>
                <Badge variant="secondary" className="ml-auto text-xs">{zoneTerritories.length} territories</Badge>
              </div>
              {zoneTerritories.length > 0 && (
                <div className="divide-y">
                  {zoneTerritories.map((t) => (
                    <div key={t.id} className="px-4 py-3">
                      {editingTerritory?.id === t.id ? (
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-2">
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
                              <Label className="text-xs">Year Target</Label>
                              <Input type="number" value={editYearTarget} onChange={e => setEditYearTarget(e.target.value)} placeholder="Year Target" />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Monthly (Auto)</Label>
                              <Input type="number" value={editCalculatedMonthly} disabled className="bg-muted" />
                            </div>
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
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-card-foreground flex items-center gap-1.5">
                              <MapPin className="h-3 w-3 text-secondary" /> {t.name}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-xs text-muted-foreground text-right">
                              <span className="font-medium">Year: {t.year_target || 0}</span>
                              <span className="mx-1">|</span>
                              <span>Monthly: {t.monthly_target || 0}</span>
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
                      <div className="grid grid-cols-2 gap-2">
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
                          <Label className="text-xs">Year Target</Label>
                          <Input type="number" value={editYearTarget} onChange={e => setEditYearTarget(e.target.value)} placeholder="Year Target" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Monthly (Auto)</Label>
                          <Input type="number" value={editCalculatedMonthly} disabled className="bg-muted" />
                        </div>
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
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-card-foreground">{t.name}</p>
                      <div className="flex items-center gap-3">
                        <div className="text-xs text-muted-foreground text-right">
                          <span className="font-medium">Year: {t.year_target || 0}</span>
                          <span className="mx-1">|</span>
                          <span>Monthly: {t.monthly_target || 0}</span>
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
