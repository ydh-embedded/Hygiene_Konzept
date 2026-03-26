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
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { CheckCircle2, Package, Plus, XCircle } from "lucide-react";

const CATEGORIES = [
  { value: "meat", label: "Fleisch", minTemp: 0, maxTemp: 7 },
  { value: "fish", label: "Fisch", minTemp: 0, maxTemp: 4 },
  { value: "dairy", label: "Milchprodukte", minTemp: 1, maxTemp: 8 },
  { value: "vegetables", label: "Gemüse / Salat", minTemp: 4, maxTemp: 12 },
  { value: "frozen", label: "Tiefkühlware", minTemp: -25, maxTemp: -18 },
  { value: "dry_goods", label: "Trockenwaren", minTemp: null, maxTemp: null },
  { value: "beverages", label: "Getränke", minTemp: null, maxTemp: null },
  { value: "other", label: "Sonstiges", minTemp: null, maxTemp: null },
] as const;

const CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  CATEGORIES.map((c) => [c.value, c.label])
);

export default function GoodsReceipt() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    supplierName: "",
    deliveryNote: "",
    productName: "",
    productCategory: "meat" as typeof CATEGORIES[number]["value"],
    quantityKg: "",
    deliveryTemperature: "",
    packagingOk: true,
    labelingOk: true,
    qualityAccepted: true,
    rejectionReason: "",
    notes: "",
  });

  const utils = trpc.useUtils();
  const { data: receipts, isLoading } = trpc.goodsReceipt.list.useQuery({ limit: 100 });

  const create = trpc.goodsReceipt.create.useMutation({
    onSuccess: () => {
      utils.goodsReceipt.list.invalidate();
      utils.dashboard.stats.invalidate();
      toast.success("Warenannahme protokolliert");
      setOpen(false);
      setForm({
        supplierName: "", deliveryNote: "", productName: "",
        productCategory: "meat", quantityKg: "", deliveryTemperature: "",
        packagingOk: true, labelingOk: true, qualityAccepted: true,
        rejectionReason: "", notes: "",
      });
    },
    onError: (e) => toast.error("Fehler: " + e.message),
  });

  const selectedCat = CATEGORIES.find((c) => c.value === form.productCategory);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.supplierName.trim()) return toast.error("Lieferant angeben");
    if (!form.productName.trim()) return toast.error("Produkt angeben");

    create.mutate({
      supplierName: form.supplierName,
      deliveryNote: form.deliveryNote || undefined,
      productName: form.productName,
      productCategory: form.productCategory,
      quantityKg: form.quantityKg ? parseFloat(form.quantityKg) : undefined,
      deliveryTemperature: form.deliveryTemperature ? parseInt(form.deliveryTemperature, 10) : undefined,
      requiredMinTemp: selectedCat?.minTemp ?? undefined,
      requiredMaxTemp: selectedCat?.maxTemp ?? undefined,
      packagingOk: form.packagingOk,
      labelingOk: form.labelingOk,
      qualityAccepted: form.qualityAccepted,
      rejectionReason: !form.qualityAccepted ? form.rejectionReason : undefined,
      notes: form.notes || undefined,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Warenannahme</h1>
          <p className="text-sm text-muted-foreground mt-0.5">QP 3 & QP 12 – Annahme- und Temperaturkontrolle</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Neue Annahme
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Warenannahme protokollieren</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Lieferant *</Label>
                  <Input
                    placeholder="Lieferantenname"
                    value={form.supplierName}
                    onChange={(e) => setForm((f) => ({ ...f, supplierName: e.target.value }))}
                    className="h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Lieferschein-Nr.</Label>
                  <Input
                    placeholder="Optional"
                    value={form.deliveryNote}
                    onChange={(e) => setForm((f) => ({ ...f, deliveryNote: e.target.value }))}
                    className="h-12"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Produkt *</Label>
                <Input
                  placeholder="Produktbezeichnung"
                  value={form.productName}
                  onChange={(e) => setForm((f) => ({ ...f, productName: e.target.value }))}
                  className="h-12"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Kategorie</Label>
                  <Select
                    value={form.productCategory}
                    onValueChange={(v) => setForm((f) => ({ ...f, productCategory: v as any }))}
                  >
                    <SelectTrigger className="h-12">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Menge (kg)</Label>
                  <Input
                    type="number"
                    inputMode="decimal"
                    placeholder="z.B. 5.5"
                    value={form.quantityKg}
                    onChange={(e) => setForm((f) => ({ ...f, quantityKg: e.target.value }))}
                    className="h-12"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Anlieferungstemperatur (°C)</Label>
                <div className="relative">
                  <Input
                    type="number"
                    inputMode="numeric"
                    placeholder="z.B. 4"
                    value={form.deliveryTemperature}
                    onChange={(e) => setForm((f) => ({ ...f, deliveryTemperature: e.target.value }))}
                    className="h-14 text-2xl font-bold text-center pr-12"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-lg font-bold text-muted-foreground">°C</span>
                </div>
                {selectedCat?.minTemp != null && (
                  <p className="text-xs text-muted-foreground">
                    Sollbereich: {selectedCat.minTemp}°C bis {selectedCat.maxTemp}°C
                  </p>
                )}
              </div>

              {/* Qualitätschecks */}
              <div className="space-y-3 p-3 rounded-lg bg-muted/50">
                <p className="text-sm font-medium">Qualitätskontrolle</p>
                {[
                  { key: "packagingOk", label: "Verpackung in Ordnung" },
                  { key: "labelingOk", label: "Kennzeichnung/Etikettierung korrekt" },
                  { key: "qualityAccepted", label: "Ware akzeptiert" },
                ].map(({ key, label }) => (
                  <div key={key} className="flex items-center justify-between">
                    <Label className="font-normal">{label}</Label>
                    <Switch
                      checked={form[key as keyof typeof form] as boolean}
                      onCheckedChange={(v) => setForm((f) => ({ ...f, [key]: v }))}
                    />
                  </div>
                ))}
              </div>

              {!form.qualityAccepted && (
                <div className="space-y-2">
                  <Label>Ablehnungsgrund *</Label>
                  <Textarea
                    placeholder="Warum wurde die Ware abgelehnt?"
                    value={form.rejectionReason}
                    onChange={(e) => setForm((f) => ({ ...f, rejectionReason: e.target.value }))}
                    rows={2}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label>Notizen</Label>
                <Textarea
                  placeholder="Weitere Anmerkungen..."
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={2}
                />
              </div>

              <Button type="submit" className="w-full h-12" disabled={create.isPending}>
                {create.isPending ? "Wird gespeichert..." : "Protokoll speichern"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Annahmeprotokoll</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-sm text-muted-foreground">Wird geladen...</div>
          ) : !receipts?.length ? (
            <div className="text-center py-12">
              <Package className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Noch keine Warenannahmen protokolliert</p>
            </div>
          ) : (
            <div className="space-y-2">
              {receipts.map((r) => (
                <div key={r.id} className={`p-4 rounded-lg border ${r.qualityAccepted ? "bg-card" : "bg-destructive/5 border-destructive/30"}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm">{r.productName}</span>
                        <Badge variant="secondary" className="text-[10px]">
                          {CATEGORY_LABELS[r.productCategory]}
                        </Badge>
                        {r.deliveryTemperature != null && (
                          <Badge
                            variant={r.temperatureOk === false ? "destructive" : "outline"}
                            className="text-[10px]"
                          >
                            {r.deliveryTemperature}°C
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {r.supplierName}
                        {r.deliveryNote ? ` · LS: ${r.deliveryNote}` : ""}
                        {r.quantityKg ? ` · ${r.quantityKg} kg` : ""}
                      </p>
                      {r.rejectionReason && (
                        <p className="text-xs text-destructive mt-1">{r.rejectionReason}</p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      {r.qualityAccepted ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      ) : (
                        <XCircle className="w-5 h-5 text-destructive" />
                      )}
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(r.receivedAt).toLocaleString("de-DE", {
                          day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit"
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
