import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { ShieldCheck, ChevronRight } from "lucide-react";

export default function HaccpPoints() {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [editNotes, setEditNotes] = useState("");

  const utils = trpc.useUtils();
  const { data: points, isLoading } = trpc.haccp.points.useQuery();

  const update = trpc.haccp.updatePoint.useMutation({
    onSuccess: () => {
      utils.haccp.points.invalidate();
      toast.success("HACCP-Punkt aktualisiert");
      setSelectedId(null);
    },
    onError: (e) => toast.error("Fehler: " + e.message),
  });

  const toggleApplicable = trpc.haccp.toggleApplicable.useMutation({
    onMutate: async ({ id, isApplicable }: { id: number; isApplicable: boolean }) => {
      await utils.haccp.points.cancel();
      const prev = utils.haccp.points.getData();
      utils.haccp.points.setData(undefined, (old) =>
        old?.map((p) => (p.id === id ? { ...p, isApplicable } : p))
      );
      return { prev };
    },
    onError: (_e: unknown, _v: unknown, ctx: { prev: typeof points } | undefined) => {
      utils.haccp.points.setData(undefined, ctx?.prev);
      toast.error("Fehler beim Aktualisieren");
    },
    onSettled: () => utils.haccp.points.invalidate(),
  });

  const selectedPoint = points?.find((p) => p.id === selectedId);

  const handleOpenDetail = (id: number) => {
    const p = points?.find((pt) => pt.id === id);
    setEditNotes(p?.notes ?? "");
    setSelectedId(id);
  };

  const handleSaveNotes = () => {
    if (!selectedId) return;
    update.mutate({ id: selectedId, notes: editNotes });
  };

  const applicable = points?.filter((p) => p.isApplicable) ?? [];
  const notApplicable = points?.filter((p) => !p.isApplicable) ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">HACCP-Qualitätspunkte</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Alle 19 Qualitätspunkte des Hygienekonzepts verwalten
        </p>
      </div>

      {/* Statistik */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-4 rounded-xl bg-card border text-center">
          <p className="text-2xl font-bold text-foreground">{points?.length ?? 0}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Gesamt</p>
        </div>
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
          <p className="text-2xl font-bold text-emerald-700">{applicable.length}</p>
          <p className="text-xs text-emerald-600 mt-0.5">Zutreffend</p>
        </div>
        <div className="p-4 rounded-xl bg-muted border text-center">
          <p className="text-2xl font-bold text-muted-foreground">{notApplicable.length}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Entfällt</p>
        </div>
      </div>

      {/* Liste */}
      {isLoading ? (
        <div className="text-center py-8 text-sm text-muted-foreground">Wird geladen...</div>
      ) : (
        <div className="space-y-2">
          {points?.map((point) => (
            <div
              key={point.id}
              className={`p-4 rounded-xl border flex items-center gap-4 transition-all ${
                point.isApplicable ? "bg-card hover:shadow-sm" : "bg-muted/30 opacity-60"
              }`}
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 font-bold text-sm ${
                point.isApplicable ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
              }`}>
                QP{point.pointNumber}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`font-semibold text-sm ${!point.isApplicable ? "line-through text-muted-foreground" : ""}`}>
                  {point.title}
                </p>
                {point.description && (
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{point.description}</p>
                )}
                {point.notes && (
                  <p className="text-xs text-primary mt-0.5 truncate">Notiz: {point.notes}</p>
                )}
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground hidden sm:block">
                    {point.isApplicable ? "Zutreffend" : "Entfällt"}
                  </span>
                  <Switch
                    checked={point.isApplicable}
                    onCheckedChange={(v) => toggleApplicable.mutate({ id: point.id, isApplicable: v })}
                  />
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={() => handleOpenDetail(point.id)}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail-Dialog */}
      <Dialog open={selectedId !== null} onOpenChange={(o) => !o && setSelectedId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-muted-foreground text-sm">QP{selectedPoint?.pointNumber}</span>
              <span>{selectedPoint?.title}</span>
            </DialogTitle>
          </DialogHeader>
          {selectedPoint && (
            <div className="space-y-4 mt-2">
              {selectedPoint.description && (
                <div className="p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground">
                  {selectedPoint.description}
                </div>
              )}
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <span className="text-sm font-medium">Auf diesen Betrieb zutreffend</span>
                <Switch
                  checked={selectedPoint.isApplicable}
                  onCheckedChange={(v) => toggleApplicable.mutate({ id: selectedPoint.id, isApplicable: v })}
                />
              </div>
              <div className="space-y-2">
                <Label>Betriebsspezifische Notizen</Label>
                <Textarea
                  placeholder="Eigene Anmerkungen, Abweichungen, Maßnahmen..."
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  rows={4}
                />
              </div>
              <Button onClick={handleSaveNotes} className="w-full" disabled={update.isPending}>
                {update.isPending ? "Wird gespeichert..." : "Notizen speichern"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
