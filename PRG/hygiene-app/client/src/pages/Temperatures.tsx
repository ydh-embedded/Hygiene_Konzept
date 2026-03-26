import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, Plus, Thermometer } from "lucide-react";

const LOCATION_CATEGORIES = [
  { value: "fridge", label: "Kühlschrank", minTemp: 1, maxTemp: 7 },
  { value: "freezer", label: "Tiefkühler", minTemp: -25, maxTemp: -18 },
  { value: "storage", label: "Lagerraum", minTemp: 10, maxTemp: 20 },
  { value: "food_hot", label: "Warmspeise", minTemp: 65, maxTemp: 100 },
  { value: "food_cold", label: "Kaltspeise", minTemp: 1, maxTemp: 7 },
  { value: "delivery", label: "Warenannahme", minTemp: 0, maxTemp: 8 },
] as const;

const PRESET_LOCATIONS = [
  "Kühlschrank 1", "Kühlschrank 2", "Tiefkühler", "Salattheke",
  "Fleischtheke", "Lagerraum", "Ausgabe warm", "Ausgabe kalt",
];

export default function Temperatures() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    location: "",
    locationCategory: "fridge" as typeof LOCATION_CATEGORIES[number]["value"],
    temperatureCelsius: "",
    notes: "",
  });

  const utils = trpc.useUtils();
  const { data: logs, isLoading } = trpc.temperature.list.useQuery({ limit: 100 });
  const { data: warnings } = trpc.temperature.warnings.useQuery();

  const create = trpc.temperature.create.useMutation({
    onSuccess: () => {
      utils.temperature.list.invalidate();
      utils.temperature.warnings.invalidate();
      utils.dashboard.stats.invalidate();
      toast.success("Temperatur erfasst");
      setOpen(false);
      setForm({ location: "", locationCategory: "fridge", temperatureCelsius: "", notes: "" });
    },
    onError: (e) => toast.error("Fehler: " + e.message),
  });

  const selectedCategory = LOCATION_CATEGORIES.find((c) => c.value === form.locationCategory);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const temp = parseInt(form.temperatureCelsius, 10);
    if (isNaN(temp)) return toast.error("Bitte eine gültige Temperatur eingeben");
    if (!form.location.trim()) return toast.error("Bitte einen Ort angeben");

    create.mutate({
      location: form.location,
      locationCategory: form.locationCategory,
      temperatureCelsius: temp,
      minThreshold: selectedCategory?.minTemp,
      maxThreshold: selectedCategory?.maxTemp,
      notes: form.notes || undefined,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Temperaturerfassung</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Kühlschränke, Tiefkühler, Speisen und Lagerräume
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Messung erfassen
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Neue Temperaturmessung</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-2">
              <div className="space-y-2">
                <Label>Kategorie</Label>
                <Select
                  value={form.locationCategory}
                  onValueChange={(v) => setForm((f) => ({ ...f, locationCategory: v as any }))}
                >
                  <SelectTrigger className="h-12">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LOCATION_CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label} ({c.minTemp}°C bis {c.maxTemp}°C)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Ort / Gerät</Label>
                <Select
                  value={form.location}
                  onValueChange={(v) => setForm((f) => ({ ...f, location: v }))}
                >
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Ort auswählen oder eingeben" />
                  </SelectTrigger>
                  <SelectContent>
                    {PRESET_LOCATIONS.map((l) => (
                      <SelectItem key={l} value={l}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Oder eigenen Ort eingeben..."
                  value={form.location}
                  onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                  className="h-12"
                />
              </div>

              <div className="space-y-2">
                <Label>Temperatur (°C)</Label>
                <div className="relative">
                  <Input
                    type="number"
                    inputMode="numeric"
                    pattern="-?[0-9]*"
                    placeholder="z.B. 4"
                    value={form.temperatureCelsius}
                    onChange={(e) => setForm((f) => ({ ...f, temperatureCelsius: e.target.value }))}
                    className="h-16 text-3xl font-bold text-center pr-12"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xl font-bold text-muted-foreground">
                    °C
                  </span>
                </div>
                {selectedCategory && (
                  <p className="text-xs text-muted-foreground">
                    Erlaubter Bereich: {selectedCategory.minTemp}°C bis {selectedCategory.maxTemp}°C
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Notizen (optional)</Label>
                <Textarea
                  placeholder="Auffälligkeiten, Maßnahmen..."
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={2}
                />
              </div>

              <Button type="submit" className="w-full h-12" disabled={create.isPending}>
                {create.isPending ? "Wird gespeichert..." : "Messung speichern"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Warnungen */}
      {(warnings?.length ?? 0) > 0 && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-destructive flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              {warnings!.length} Temperaturwarnung{warnings!.length !== 1 ? "en" : ""}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {warnings!.map((w) => (
              <div key={w.id} className="flex items-center gap-3 text-sm">
                <Thermometer className="w-4 h-4 text-destructive shrink-0" />
                <span className="font-medium">{w.location}</span>
                <span className="text-destructive font-bold">{w.temperatureCelsius}°C</span>
                <span className="text-muted-foreground text-xs ml-auto">
                  {new Date(w.recordedAt).toLocaleString("de-DE")}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Messungen */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Messprotokoll</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-sm text-muted-foreground text-center py-8">Wird geladen...</div>
          ) : !logs?.length ? (
            <div className="text-center py-12">
              <Thermometer className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Noch keine Messungen vorhanden</p>
              <p className="text-xs text-muted-foreground mt-1">Erfassen Sie die erste Temperatur mit dem Button oben.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {logs.map((log) => {
                const cat = LOCATION_CATEGORIES.find((c) => c.value === log.locationCategory);
                return (
                  <div
                    key={log.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border ${
                      log.isWithinRange ? "bg-card" : "bg-destructive/5 border-destructive/30"
                    }`}
                  >
                    <div className={`p-2 rounded-lg ${log.isWithinRange ? "bg-emerald-50" : "bg-destructive/10"}`}>
                      {log.isWithinRange ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-destructive" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{log.location}</span>
                        <Badge variant="secondary" className="text-[10px]">{cat?.label}</Badge>
                      </div>
                      {log.notes && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">{log.notes}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-lg font-bold ${log.isWithinRange ? "text-foreground" : "text-destructive"}`}>
                        {log.temperatureCelsius}°C
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(log.recordedAt).toLocaleString("de-DE", {
                          day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit"
                        })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
