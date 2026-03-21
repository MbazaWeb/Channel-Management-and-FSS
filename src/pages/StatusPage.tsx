import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Database, Search, Filter, ArrowLeft, Users, CheckCircle, XCircle, Clock, Shield, FileText, Activity, UserCheck, TrendingUp } from 'lucide-react';
import type { Database as DbTypes } from '@/integrations/supabase/types';

type Application = DbTypes['public']['Tables']['applications']['Row'] & {
  territories?: { name: string } | null;
  zones?: { name: string } | null;
};

export default function StatusPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [zoneFilter, setZoneFilter] = useState<string>('all');
  const [territoryFilter, setTerritoryFilter] = useState<string>('all');
  const [channelFilter, setChannelFilter] = useState<string>('all');
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [fssFilter, setFssFilter] = useState<string>('all');

  const { data: applications = [], isLoading } = useQuery({
    queryKey: ['applications-database'],
    queryFn: async () => {
      const { data } = await supabase
        .from('applications')
        .select('*, territories(name), zones(name)')
        .order('created_at', { ascending: false });
      return (data ?? []) as Application[];
    },
  });

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
      const { data } = await supabase.from('territories').select('*').order('name');
      return data ?? [];
    },
  });

  // Filter territories based on selected zone
  const filteredTerritories = zoneFilter === 'all' 
    ? territories 
    : territories.filter(t => t.zone_id === zoneFilter);

  // Filter applications
  const filteredApplications = applications.filter((app) => {
    const matchesSearch =
      search === '' ||
      app.trading_name?.toLowerCase().includes(search.toLowerCase()) ||
      app.contact_person_name?.toLowerCase().includes(search.toLowerCase()) ||
      app.contact_person_surname?.toLowerCase().includes(search.toLowerCase()) ||
      app.dsf_d_number?.toLowerCase().includes(search.toLowerCase()) ||
      app.email1?.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === 'all' || app.status === statusFilter;
    const matchesZone = zoneFilter === 'all' || app.zone_id === zoneFilter;
    const matchesTerritory = territoryFilter === 'all' || app.territory_id === territoryFilter;
    const matchesChannel = channelFilter === 'all' || app.channel === channelFilter || (channelFilter === 'ESP' && !app.channel);
    const matchesActive = activeFilter === 'all' || 
                          (activeFilter === 'active' && app.is_active) ||
                          (activeFilter === 'inactive' && !app.is_active);
    const matchesFss = fssFilter === 'all' || 
                       (fssFilter === 'yes' && app.fss_user) ||
                       (fssFilter === 'no' && !app.fss_user);

    return matchesSearch && matchesStatus && matchesZone && matchesTerritory && matchesChannel && matchesActive && matchesFss;
  });

  // Calculate summary stats
  const stats = {
    total: applications.length,
    approved: applications.filter(a => a.status === 'approved').length,
    rejected: applications.filter(a => a.status === 'rejected').length,
    pending: applications.filter(a => a.status === 'pending').length,
    espTotal: applications.filter(a => a.channel === 'ESP' || !a.channel).length,
    espApproved: applications.filter(a => (a.channel === 'ESP' || !a.channel) && a.status === 'approved').length,
    espActive: applications.filter(a => (a.channel === 'ESP' || !a.channel) && a.is_active).length,
    dsfTotal: applications.filter(a => a.channel === 'DSF').length,
    dsfApproved: applications.filter(a => a.channel === 'DSF' && a.status === 'approved').length,
    dsfActive: applications.filter(a => a.channel === 'DSF' && a.is_active).length,
    fssTotal: applications.filter(a => a.fss_user).length,
    active: applications.filter(a => a.is_active).length,
    inactive: applications.filter(a => a.status === 'approved' && !a.is_active).length,
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500/10 text-red-600 border-red-500/20">Rejected</Badge>;
      case 'in_progress':
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">In Progress</Badge>;
      case 'pending':
      default:
        return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">Pending</Badge>;
    }
  };

  const getChannelType = (app: Application) => {
    const types: string[] = [];
    if (app.channel_types && Array.isArray(app.channel_types)) {
      types.push(...app.channel_types.map((t: string) => t.charAt(0).toUpperCase() + t.slice(1)));
    }
    if (app.channel_type_other) {
      types.push(app.channel_type_other);
    }
    return types.length > 0 ? types.join(', ') : 'N/A';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="h-8 w-8">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="h-10 w-10 rounded-lg gradient-primary flex items-center justify-center">
          <Database className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-xl font-display font-bold text-foreground">Channel Database</h1>
          <p className="text-sm text-muted-foreground">Complete ESP & DSF channel partner database</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <Card className="bg-gradient-to-br from-primary/5 to-primary/10">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">Total</span>
            </div>
            <p className="text-xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-500/5 to-green-500/10">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-xs text-muted-foreground">Approved</span>
            </div>
            <p className="text-xl font-bold text-green-600">{stats.approved}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-red-500/5 to-red-500/10">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-600" />
              <span className="text-xs text-muted-foreground">Rejected</span>
            </div>
            <p className="text-xl font-bold text-red-600">{stats.rejected}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-yellow-500/5 to-yellow-500/10">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-600" />
              <span className="text-xs text-muted-foreground">Pending</span>
            </div>
            <p className="text-xl font-bold text-yellow-600">{stats.pending}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-500/5 to-blue-500/10">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-blue-600" />
              <span className="text-xs text-muted-foreground">ESP Total</span>
            </div>
            <p className="text-xl font-bold">{stats.espTotal}</p>
            <p className="text-xs text-muted-foreground">{stats.espActive} active</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-500/5 to-purple-500/10">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-purple-600" />
              <span className="text-xs text-muted-foreground">DSF Total</span>
            </div>
            <p className="text-xl font-bold">{stats.dsfTotal}</p>
            <p className="text-xs text-muted-foreground">{stats.dsfActive} active</p>
          </CardContent>
        </Card>
      </div>

      {/* Active/FSS Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-green-600" />
                <span className="text-xs text-muted-foreground">Active Channels</span>
              </div>
              <Badge className="bg-green-500/10 text-green-600">{stats.active}</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.approved > 0 ? Math.round((stats.active / stats.approved) * 100) : 0}% of approved
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-blue-600" />
                <span className="text-xs text-muted-foreground">ESP Performance</span>
              </div>
              <Badge className="bg-blue-500/10 text-blue-600">
                {stats.espApproved > 0 ? Math.round((stats.espActive / stats.espApproved) * 100) : 0}%
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{stats.espActive} of {stats.espApproved} active</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-purple-600" />
                <span className="text-xs text-muted-foreground">DSF Performance</span>
              </div>
              <Badge className="bg-purple-500/10 text-purple-600">
                {stats.dsfApproved > 0 ? Math.round((stats.dsfActive / stats.dsfApproved) * 100) : 0}%
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{stats.dsfActive} of {stats.dsfApproved} active</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-primary" />
                <span className="text-xs text-muted-foreground">FSS Users</span>
              </div>
              <Badge className="bg-primary/10 text-primary">{stats.fssTotal}</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.total > 0 ? Math.round((stats.fssTotal / stats.total) * 100) : 0}% of total
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Filter className="h-4 w-4" /> Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search name, email, D-number..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={channelFilter} onValueChange={setChannelFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Channel Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Channels</SelectItem>
                <SelectItem value="ESP">ESP</SelectItem>
                <SelectItem value="DSF">DSF</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Application Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
            <Select value={activeFilter} onValueChange={setActiveFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Active Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Active Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <Select value={zoneFilter} onValueChange={(v) => { setZoneFilter(v); setTerritoryFilter('all'); }}>
              <SelectTrigger>
                <SelectValue placeholder="Zone" />
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
            <Select value={territoryFilter} onValueChange={setTerritoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Territory" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Territories</SelectItem>
                {filteredTerritories.map((territory) => (
                  <SelectItem key={territory.id} value={territory.id}>
                    {territory.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={fssFilter} onValueChange={setFssFilter}>
              <SelectTrigger>
                <SelectValue placeholder="FSS Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All FSS Status</SelectItem>
                <SelectItem value="yes">FSS User</SelectItem>
                <SelectItem value="no">Non-FSS User</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                setSearch('');
                setStatusFilter('all');
                setZoneFilter('all');
                setTerritoryFilter('all');
                setChannelFilter('all');
                setActiveFilter('all');
                setFssFilter('all');
              }}
              className="h-10"
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Channel Partners</CardTitle>
          <CardDescription>
            Showing {filteredApplications.length} of {applications.length} records
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : filteredApplications.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No records found matching your criteria
            </div>
          ) : (
            <ScrollArea className="h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Channel Name</TableHead>
                    <TableHead>Channel</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Zone</TableHead>
                    <TableHead>Territory</TableHead>
                    <TableHead>Active</TableHead>
                    <TableHead>FSS</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredApplications.map((app) => (
                    <TableRow key={app.id}>
                      <TableCell className="font-medium">
                        <div>
                          {app.trading_name || `${app.contact_person_name} ${app.contact_person_surname}`}
                          {app.dsf_d_number && (
                            <p className="text-xs text-muted-foreground">{app.dsf_d_number}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={app.channel === 'DSF' ? 'secondary' : 'default'} className="text-xs">
                          {app.channel || 'ESP'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">{getChannelType(app)}</TableCell>
                      <TableCell>{app.zones?.name || 'N/A'}</TableCell>
                      <TableCell>{app.territories?.name || 'N/A'}</TableCell>
                      <TableCell>
                        <Badge 
                          className={app.is_active 
                            ? 'bg-green-500/10 text-green-600 border-green-500/20' 
                            : 'bg-gray-500/10 text-gray-600 border-gray-500/20'}
                        >
                          {app.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={app.fss_user ? 'default' : 'secondary'} 
                          className={app.fss_user ? 'bg-blue-500/10 text-blue-600 border-blue-500/20' : ''}
                        >
                          {app.fss_user ? 'Yes' : 'No'}
                        </Badge>
                      </TableCell>
                      <TableCell>{getStatusBadge(app.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
