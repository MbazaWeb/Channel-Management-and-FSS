import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { StatCard } from '@/components/dashboard/StatCard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link, useNavigate } from 'react-router-dom';
import { Users, Target, FileText, Plus, MapPin, ArrowLeft } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type DETerritory = { territory_id: string; territories: { id: string; name: string; monthly_target: number | null; weekly_target: number | null } | null };

export default function DEPanel() {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const isDE = role === 'de';

  const { data: myTerritories = [] } = useQuery({
    queryKey: ['de-territories', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('de_territories')
        .select('territory_id, territories(id, name, monthly_target, weekly_target)')
        .eq('user_id', user!.id);
      return (data ?? []) as DETerritory[];
    },
    enabled: !!user && isDE,
  });

  const territoryIds = myTerritories.map((dt) => dt.territories?.id).filter(Boolean);

  const { data: apps = [] } = useQuery({
    queryKey: ['de-applications', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('applications')
        .select('*')
        .eq('submitted_by', user!.id)
        .order('created_at', { ascending: false });
      return data ?? [];
    },
    enabled: !!user && isDE,
  });

  if (!isDE) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
        <Users className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="font-display font-bold text-xl text-foreground">Access Denied</h2>
        <p className="text-muted-foreground mt-1">DE access required</p>
      </div>
    );
  }

  const totalSubmitted = apps.length;
  const approved = apps.filter(a => a.status === 'approved').length;
  const pending = apps.filter(a => a.status === 'pending').length;

  const statusColors: Record<string, string> = {
    pending: 'bg-warning/10 text-warning border-warning/20',
    approved: 'bg-success/10 text-success border-success/20',
    rejected: 'bg-destructive/10 text-destructive border-destructive/20',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="h-10 w-10 rounded-lg gradient-primary flex items-center justify-center">
            <Users className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-display font-bold text-foreground">DE Panel</h1>
            <p className="text-xs text-muted-foreground">{user?.email}</p>
          </div>
        </div>
        <Link to="/apply">
          <Button size="sm" className="gap-1">
            <Plus className="h-4 w-4" /> New
          </Button>
        </Link>
      </div>

      {/* Territory info */}
      {myTerritories.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {myTerritories.map((dt) => (
            <Badge key={dt.territory_id} variant="outline" className="gap-1">
              <MapPin className="h-3 w-3" /> {dt.territories?.name}
            </Badge>
          ))}
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        <StatCard title="Submitted" value={totalSubmitted} icon={FileText} color="primary" />
        <StatCard title="Approved" value={approved} icon={Target} color="success" />
        <StatCard title="Pending" value={pending} icon={Target} color="accent" />
      </div>

      <div className="space-y-3">
        <h2 className="font-display font-semibold text-foreground">My Applications</h2>
        {apps.map(app => (
          <div key={app.id} className="rounded-xl border bg-card p-4 shadow-card">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium text-card-foreground">{app.trading_name}</p>
                <p className="text-xs text-muted-foreground">
                  {app.contact_person_name} {app.contact_person_surname}
                </p>
              </div>
              <Badge variant="outline" className={statusColors[app.status]}>{app.status}</Badge>
            </div>
          </div>
        ))}
        {apps.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No applications submitted yet</p>
            <Link to="/apply">
              <Button variant="outline" size="sm" className="mt-3 gap-1">
                <Plus className="h-4 w-4" /> Submit First Application
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
