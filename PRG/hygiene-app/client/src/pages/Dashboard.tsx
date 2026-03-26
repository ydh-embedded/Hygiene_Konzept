import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Package,
  ShieldCheck,
  Thermometer,
  TrendingUp,
  Truck,
} from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { data: stats, isLoading } = trpc.dashboard.stats.useQuery(undefined, {
    refetchInterval: 30_000,
  });
  const { data: warnings } = trpc.temperature.warnings.useQuery();
  const { data: haccpPoints } = trpc.haccp.points.useQuery();

  const today = new Date().toLocaleDateString("de-DE", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const applicablePoints = haccpPoints?.filter((p) => p.isApplicable) ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{today}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {user?.role === "admin" ? "Administrator" : "Mitarbeiter"}
          </Badge>
        </div>
      </div>

      {/* Warnungen */}
      {(warnings?.length ?? 0) > 0 && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-destructive text-sm">
              {warnings!.length} Temperaturwarnung{warnings!.length !== 1 ? "en" : ""}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Einige Messwerte liegen außerhalb des erlaubten Bereichs. Bitte sofort prüfen.
            </p>
          </div>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => setLocation("/temperatures")}
            className="shrink-0"
          >
            Ansehen
          </Button>
        </div>
      )}

      {/* KPI-Karten */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Thermometer className="w-5 h-5" />}
          label="Temperaturmessungen heute"
          value={isLoading ? "–" : String(stats?.todayTemperatureChecks ?? 0)}
          color="blue"
          onClick={() => setLocation("/temperatures")}
        />
        <StatCard
          icon={<ClipboardCheck className="w-5 h-5" />}
          label="Checklisten heute erledigt"
          value={isLoading ? "–" : String(stats?.todayChecklistCompletions ?? 0)}
          color="emerald"
          onClick={() => setLocation("/checklists")}
        />
        <StatCard
          icon={<AlertTriangle className="w-5 h-5" />}
          label="Temperaturwarnungen"
          value={isLoading ? "–" : String(stats?.temperatureWarnings ?? 0)}
          color={stats?.temperatureWarnings ? "red" : "emerald"}
          onClick={() => setLocation("/temperatures")}
        />
        <StatCard
          icon={<ShieldCheck className="w-5 h-5" />}
          label="Aktive HACCP-Punkte"
          value={String(applicablePoints.length)}
          color="navy"
          onClick={() => setLocation("/haccp")}
        />
      </div>

      {/* Schnellzugriff */}
      <div>
        <h2 className="text-base font-semibold mb-3 text-foreground">Schnellerfassung</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {[
            { icon: Thermometer, label: "Temperatur messen", path: "/temperatures", color: "bg-blue-50 text-blue-700 border-blue-200" },
            { icon: ClipboardCheck, label: "Checkliste ausfüllen", path: "/checklists", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
            { icon: Truck, label: "Warenannahme", path: "/goods-receipt", color: "bg-amber-50 text-amber-700 border-amber-200" },
            { icon: CheckCircle2, label: "Reinigung bestätigen", path: "/cleaning", color: "bg-violet-50 text-violet-700 border-violet-200" },
          ].map((item) => (
            <button
              key={item.path}
              onClick={() => setLocation(item.path)}
              className={`flex flex-col items-center gap-3 p-4 rounded-xl border ${item.color} transition-all hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 text-center`}
            >
              <item.icon className="w-7 h-7" />
              <span className="text-xs font-medium leading-tight">{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Letzte Warenannahmen */}
      {(stats?.recentReceipts?.length ?? 0) > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-foreground">Letzte Warenannahmen</h2>
            <Button variant="ghost" size="sm" onClick={() => setLocation("/goods-receipt")}>
              Alle ansehen
            </Button>
          </div>
          <div className="space-y-2">
            {stats!.recentReceipts.map((r: any) => (
              <div key={r.id} className="flex items-center gap-3 p-3 rounded-lg bg-card border">
                <Package className="w-4 h-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{r.productName}</p>
                  <p className="text-xs text-muted-foreground truncate">{r.supplierName}</p>
                </div>
                <Badge
                  variant={r.qualityAccepted ? "outline" : "destructive"}
                  className="text-xs shrink-0"
                >
                  {r.qualityAccepted ? "Akzeptiert" : "Abgelehnt"}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* HACCP-Punkte Übersicht */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-foreground">HACCP-Qualitätspunkte</h2>
          <Button variant="ghost" size="sm" onClick={() => setLocation("/haccp")}>
            Details
          </Button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {haccpPoints?.slice(0, 6).map((point) => (
            <div
              key={point.id}
              className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:shadow-sm transition-all ${
                !point.isApplicable ? "opacity-50 bg-muted/30" : "bg-card"
              }`}
              onClick={() => setLocation("/haccp")}
            >
              <span className="text-xs font-bold text-muted-foreground w-6 shrink-0">
                QP{point.pointNumber}
              </span>
              <span className="text-sm truncate flex-1">{point.title}</span>
              {!point.isApplicable && (
                <Badge variant="secondary" className="text-[10px] shrink-0">entfällt</Badge>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: "blue" | "emerald" | "red" | "navy";
  onClick?: () => void;
}) {
  const colorMap = {
    blue: "text-blue-600 bg-blue-50",
    emerald: "text-emerald-600 bg-emerald-50",
    red: "text-red-600 bg-red-50",
    navy: "text-primary bg-primary/10",
  };

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-all hover:-translate-y-0.5 active:translate-y-0"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className={`p-2 rounded-lg ${colorMap[color]}`}>{icon}</div>
          <TrendingUp className="w-3.5 h-3.5 text-muted-foreground/40 mt-1" />
        </div>
        <div className="mt-3">
          <p className="text-2xl font-bold text-foreground">{value}</p>
          <p className="text-xs text-muted-foreground mt-0.5 leading-tight">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
