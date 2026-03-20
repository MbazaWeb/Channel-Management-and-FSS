import { Trophy } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface TerritoryData {
  name: string;
  target: number;
  actual: number;
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
                <div className="flex items-center gap-2 mt-1">
                  <Progress value={Math.min(pct, 100)} className="h-2 flex-1" />
                  <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                    {t.actual}/{t.target} ({pct}%)
                  </span>
                </div>
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
