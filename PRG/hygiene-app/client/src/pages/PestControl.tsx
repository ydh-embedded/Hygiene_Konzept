import { useState, useRef } from "react";
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
import { Bug, Camera, CheckCircle2, Plus, Upload } from "lucide-react";

const STATUS_MAP = {
  ok: { label: "In Ordnung", color: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  findings: { label: "Befund", color: "bg-amber-100 text-amber-800 border-amber-200" },
  treated: { label: "Behandelt", color: "bg-blue-100 text-blue-800 border-blue-200" },
  follow_up: { label: "Nachkontrolle", color: "bg-orange-100 text-orange-800 border-orange-200" },
};

export default function PestControl() {
  const [open, setOpen] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [photoMime, setPhotoMime] = useState<string>("image/jpeg");
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    inspectionDate: new Date().toISOString().slice(0, 16),
    inspector: "",
    area: "",
    pestType: "",
    findingsDescription: "",
    measuresToken: "",
    nextInspectionDate: "",
    status: "ok" as keyof typeof STATUS_MAP,
  });

  const utils = trpc.useUtils();
  const { data: records, isLoading } = trpc.pestControl.list.useQuery({ limit: 100 });

  const uploadPhoto = trpc.pestControl.uploadPhoto.useMutation();
  const create = trpc.pestControl.create.useMutation({
    onSuccess: () => {
      utils.pestControl.list.invalidate();
      toast.success("Schädlingskontrolle gespeichert");
      setOpen(false);
      setPhotoPreview(null);
      setPhotoBase64(null);
      setForm({
        inspectionDate: new Date().toISOString().slice(0, 16),
        inspector: "", area: "", pestType: "", findingsDescription: "",
        measuresToken: "", nextInspectionDate: "", status: "ok",
      });
    },
    onError: (e) => toast.error("Fehler: " + e.message),
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return toast.error("Foto max. 5 MB");
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      setPhotoPreview(result);
      setPhotoBase64(result.split(",")[1]);
      setPhotoMime(file.type);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.inspector.trim() || !form.area.trim()) return toast.error("Prüfer und Bereich angeben");

    let photoUrl: string | undefined;
    if (photoBase64) {
      try {
        const res = await uploadPhoto.mutateAsync({ base64: photoBase64, mimeType: photoMime });
        photoUrl = res.url;
      } catch {
        toast.error("Foto-Upload fehlgeschlagen");
        return;
      }
    }

    create.mutate({
      inspectionDate: new Date(form.inspectionDate),
      inspector: form.inspector,
      area: form.area,
      pestType: form.pestType || undefined,
      findingsDescription: form.findingsDescription || undefined,
      measuresToken: form.measuresToken || undefined,
      photoUrl,
      nextInspectionDate: form.nextInspectionDate ? new Date(form.nextInspectionDate) : undefined,
      status: form.status,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Schädlingskontrolle</h1>
          <p className="text-sm text-muted-foreground mt-0.5">QP 14 – Dokumentation und Befunde</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Kontrolle erfassen
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Schädlingskontrolle dokumentieren</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Datum & Uhrzeit</Label>
                  <Input type="datetime-local" value={form.inspectionDate}
                    onChange={(e) => setForm((f) => ({ ...f, inspectionDate: e.target.value }))} className="h-12" />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v as any }))}>
                    <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(STATUS_MAP).map(([v, { label }]) => (
                        <SelectItem key={v} value={v}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Prüfer *</Label>
                  <Input placeholder="Name des Prüfers" value={form.inspector}
                    onChange={(e) => setForm((f) => ({ ...f, inspector: e.target.value }))} className="h-12" />
                </div>
                <div className="space-y-2">
                  <Label>Bereich *</Label>
                  <Input placeholder="z.B. Küche, Lager" value={form.area}
                    onChange={(e) => setForm((f) => ({ ...f, area: e.target.value }))} className="h-12" />
                </div>
              </div>

              {form.status !== "ok" && (
                <>
                  <div className="space-y-2">
                    <Label>Schädlingsart</Label>
                    <Input placeholder="z.B. Mäuse, Insekten" value={form.pestType}
                      onChange={(e) => setForm((f) => ({ ...f, pestType: e.target.value }))} className="h-12" />
                  </div>
                  <div className="space-y-2">
                    <Label>Befundbeschreibung</Label>
                    <Textarea placeholder="Was wurde gefunden?" value={form.findingsDescription}
                      onChange={(e) => setForm((f) => ({ ...f, findingsDescription: e.target.value }))} rows={2} />
                  </div>
                  <div className="space-y-2">
                    <Label>Ergriffene Maßnahmen</Label>
                    <Textarea placeholder="Welche Maßnahmen wurden eingeleitet?" value={form.measuresToken}
                      onChange={(e) => setForm((f) => ({ ...f, measuresToken: e.target.value }))} rows={2} />
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label>Nächste Kontrolle</Label>
                <Input type="datetime-local" value={form.nextInspectionDate}
                  onChange={(e) => setForm((f) => ({ ...f, nextInspectionDate: e.target.value }))} className="h-12" />
              </div>

              {/* Foto-Upload */}
              <div className="space-y-2">
                <Label>Foto (optional)</Label>
                <input ref={fileRef} type="file" accept="image/*" capture="environment"
                  onChange={handleFileChange} className="hidden" />
                {photoPreview ? (
                  <div className="relative">
                    <img src={photoPreview} alt="Vorschau" className="w-full h-40 object-cover rounded-lg border" />
                    <Button type="button" size="sm" variant="secondary"
                      className="absolute top-2 right-2" onClick={() => { setPhotoPreview(null); setPhotoBase64(null); }}>
                      Entfernen
                    </Button>
                  </div>
                ) : (
                  <button type="button" onClick={() => fileRef.current?.click()}
                    className="w-full h-24 rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary/50 hover:bg-muted/50 transition-colors">
                    <Camera className="w-6 h-6" />
                    <span className="text-xs">Foto aufnehmen oder hochladen</span>
                  </button>
                )}
              </div>

              <Button type="submit" className="w-full h-12" disabled={create.isPending || uploadPhoto.isPending}>
                {create.isPending || uploadPhoto.isPending ? "Wird gespeichert..." : "Kontrolle speichern"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Kontrollprotokoll</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-sm text-muted-foreground">Wird geladen...</div>
          ) : !records?.length ? (
            <div className="text-center py-12">
              <Bug className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Noch keine Schädlingskontrollen dokumentiert</p>
            </div>
          ) : (
            <div className="space-y-3">
              {records.map((r) => {
                const statusInfo = STATUS_MAP[r.status];
                return (
                  <div key={r.id} className="p-4 rounded-lg border bg-card">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm">{r.area}</span>
                          <Badge className={`text-[10px] border ${statusInfo.color}`}>{statusInfo.label}</Badge>
                          {r.pestType && <Badge variant="outline" className="text-[10px]">{r.pestType}</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Prüfer: {r.inspector}</p>
                        {r.findingsDescription && (
                          <p className="text-xs text-foreground mt-1.5 bg-amber-50 border border-amber-200 rounded p-2">
                            {r.findingsDescription}
                          </p>
                        )}
                        {r.measuresToken && (
                          <p className="text-xs text-muted-foreground mt-1">Maßnahmen: {r.measuresToken}</p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(r.inspectionDate).toLocaleDateString("de-DE")}
                        </span>
                        {r.photoUrl && (
                          <a href={r.photoUrl} target="_blank" rel="noopener noreferrer">
                            <img src={r.photoUrl} alt="Befund" className="w-14 h-14 object-cover rounded-lg border" />
                          </a>
                        )}
                      </div>
                    </div>
                    {r.nextInspectionDate && (
                      <p className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1">
                        Nächste Kontrolle: {new Date(r.nextInspectionDate).toLocaleDateString("de-DE")}
                      </p>
                    )}
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
