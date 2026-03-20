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
import { ClipboardList, Search, Filter, ArrowLeft, Users } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type Application = Database['public']['Tables']['applications']['Row'] & {
  territories?: { name: string } | null;
  zones?: { name: string } | null;
};

export default function StatusPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [zoneFilter, setZoneFilter] = useState<string>('all');

  const { data: applications = [], isLoading } = useQuery({
    queryKey: ['applications-status'],
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

  // Filter applications
  const filteredApplications = applications.filter((app) => {
    const matchesSearch =
      search === '' ||
      app.trading_name?.toLowerCase().includes(search.toLowerCase()) ||
      app.contact_person_name?.toLowerCase().includes(search.toLowerCase()) ||
      app.contact_person_surname?.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === 'all' || app.status === statusFilter;
    const matchesZone = zoneFilter === 'all' || app.zone_id === zoneFilter;

    return matchesSearch && matchesStatus && matchesZone;
  });

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500/10 text-red-600 border-red-500/20">Rejected</Badge>;
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
          <ClipboardList className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-xl font-display font-bold text-foreground">Application Status</h1>
          <p className="text-sm text-muted-foreground">Track channel partner application status</p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Filter className="h-4 w-4" /> Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name..."
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
                  <SelectItem key={zone.id} value={zone.id}>
                    {zone.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Applications</CardTitle>
          <CardDescription>
            Showing {filteredApplications.length} of {applications.length} applications
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : filteredApplications.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No applications found matching your criteria
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Channel Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Zone</TableHead>
                    <TableHead>Territory</TableHead>
                    <TableHead>FSS</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredApplications.map((app) => (
                    <TableRow key={app.id}>
                      <TableCell className="font-medium">
                        {app.trading_name || `${app.contact_person_name} ${app.contact_person_surname}`}
                      </TableCell>
                      <TableCell>{getChannelType(app)}</TableCell>
                      <TableCell>{app.zones?.name || 'N/A'}</TableCell>
                      <TableCell>{app.territories?.name || 'N/A'}</TableCell>
                      <TableCell>
                        <Badge variant={app.fss_user ? 'default' : 'secondary'} className={app.fss_user ? 'bg-green-500/10 text-green-600 border-green-500/20' : ''}>
                          {app.fss_user ? 'Yes' : 'No'}
                        </Badge>
                      </TableCell>
                      <TableCell>{getStatusBadge(app.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
