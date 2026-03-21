import { Trophy } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface TerritoryData {
  name: string;
  target: number;
  actual: number;
  espTarget?: number;
  dsfTarget?: number;
  espActual?: number;
  dsfActual?: number;
  espCount?: number;
  dsfCount?: number;
  fssCount?: number;
}

interface Props {
  territories: TerritoryData[];
}

export function TerritoryLeaderboard({ territories }: Props) {
  const sorted = [...territories].sort((a, b) => {
    const aP = a.target > 0 ? (a.actual / a.target) * 100 : 0;
    const bP = b.target > 0 ? (b.actual / b.target) * 100 : 0;
    return bP - aP;
  });

  return (
    <div className="rounded-xl border bg-card shadow-card">
      <div className="flex items-center gap-2 p-4 border-b">
        <Trophy className="h-5 w-5 text-accent" />
        <h3 className="font-display font-semibold text-card-foreground">Territory Leaderboard</h3>
      </div>
      <div className="divide-y">
        {sorted.map((t, i) => {
          const pct = t.target > 0 ? Math.round((t.actual / t.target) * 100) : 0;
          const espPct = (t.espTarget || 0) > 0 ? Math.round(((t.espActual || 0) / t.espTarget!) * 100) : 0;
          const dsfPct = (t.dsfTarget || 0) > 0 ? Math.round(((t.dsfActual || 0) / t.dsfTarget!) * 100) : 0;
          return (
            <div key={t.name} className="flex items-center gap-3 p-4">
              <span className={`flex items-center justify-center h-7 w-7 rounded-full text-xs font-bold ${
                i === 0 ? 'bg-accent text-accent-foreground' :
                i === 1 ? 'bg-muted text-muted-foreground' :
                'bg-muted text-muted-foreground'
              }`}>
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-card-foreground truncate">{t.name}</p>
                {/* Overall Progress */}
                <div className="flex items-center gap-2 mt-1">
                  <Progress value={Math.min(pct, 100)} className="h-2 flex-1" />
                  <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                    {t.actual}/{t.target} ({pct}%)
                  </span>
                </div>
                {/* ESP/DSF Target Progress */}
                {((t.espTarget || 0) > 0 || (t.dsfTarget || 0) > 0) && (
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div className="rounded bg-blue-50 dark:bg-blue-950/30 p-1.5">
                      <div className="flex justify-between text-xs mb-0.5">
                        <span className="text-blue-600 font-medium">ESP</span>
                        <span className="text-muted-foreground">{t.espActual || 0}/{t.espTarget || 0} ({espPct}%)</span>
                      </div>
                      <Progress value={Math.min(espPct, 100)} className="h-1 bg-blue-100" />
                    </div>
                    <div className="rounded bg-purple-50 dark:bg-purple-950/30 p-1.5">
                      <div className="flex justify-between text-xs mb-0.5">
                        <span className="text-purple-600 font-medium">DSF</span>
                        <span className="text-muted-foreground">{t.dsfActual || 0}/{t.dsfTarget || 0} ({dsfPct}%)</span>
                      </div>
                      <Progress value={Math.min(dsfPct, 100)} className="h-1 bg-purple-100" />
                    </div>
                  </div>
                )}
                {/* Base count badges */}
                {(t.espCount !== undefined || t.dsfCount !== undefined || t.fssCount !== undefined) && (
                  <div className="flex gap-2 mt-2">
                    <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">
                      ESP Base: {t.espCount || 0}
                    </span>
                    <span className="text-xs px-1.5 py-0.5 rounded bg-purple-100 text-purple-700">
                      DSF Base: {t.dsfCount || 0}
                    </span>
                    <span className="text-xs px-1.5 py-0.5 rounded bg-green-100 text-green-700">
                      FSS: {t.fssCount || 0}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {sorted.length === 0 && (
          <p className="p-4 text-sm text-muted-foreground text-center">No territories yet</p>
        )}
      </div>
    </div>
  );
}
