import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { BookOpen, Plus, Users } from "lucide-react";

export default function Training() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    trainingTitle: "",
    trainingDate: new Date().toISOString().slice(0, 16),
    trainer: "",
    participants: "",
    topics: "",
    notes: "",
  });

  const utils = trpc.useUtils();
  const { data: records, isLoading } = trpc.training.list.useQuery({ limit: 100 });
  const { data: users } = trpc.users.list.useQuery();

  const create = trpc.training.create.useMutation({
    onSuccess: () => {
      utils.training.list.invalidate();
      toast.success("Schulung dokumentiert");
      setOpen(false);
      setForm({ trainingTitle: "", trainingDate: new Date().toISOString().slice(0, 16), trainer: "", participants: "", topics: "", notes: "" });
    },
    onError: (e) => toast.error("Fehler: " + e.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.trainingTitle.trim() || !form.trainer.trim()) return toast.error("Titel und Trainer angeben");
    create.mutate({
      trainingTitle: form.trainingTitle,
      trainingDate: new Date(form.trainingDate),
      trainer: form.trainer,
      participantIds: [],
      topics: form.topics || undefined,
      notes: form.notes || undefined,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Schulungen</h1>
          <p className="text-sm text-muted-foreground mt-0.5">QP 17 – Mitarbeiterschulungen dokumentieren</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Schulung erfassen
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Schulung dokumentieren</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-2">
              <div className="space-y-2">
                <Label>Schulungsthema *</Label>
                <Input placeholder="z.B. Lebensmittelhygiene, HACCP-Grundlagen" value={form.trainingTitle}
                  onChange={(e) => setForm((f) => ({ ...f, trainingTitle: e.target.value }))} className="h-12" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Datum & Uhrzeit</Label>
                  <Input type="datetime-local" value={form.trainingDate}
                    onChange={(e) => setForm((f) => ({ ...f, trainingDate: e.target.value }))} className="h-12" />
                </div>
                <div className="space-y-2">
                  <Label>Trainer / Dozent *</Label>
                  <Input placeholder="Name" value={form.trainer}
                    onChange={(e) => setForm((f) => ({ ...f, trainer: e.target.value }))} className="h-12" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Teilnehmer (Namen, kommagetrennt)</Label>
                <Input placeholder="z.B. Max Müller, Anna Schmidt" value={form.participants}
                  onChange={(e) => setForm((f) => ({ ...f, participants: e.target.value }))} className="h-12" />
              </div>
              <div className="space-y-2">
                <Label>Behandelte Themen</Label>
                <Textarea placeholder="Welche Inhalte wurden vermittelt?" value={form.topics}
                  onChange={(e) => setForm((f) => ({ ...f, topics: e.target.value }))} rows={2} />
              </div>
              <div className="space-y-2">
                <Label>Notizen</Label>
                <Textarea placeholder="Weitere Anmerkungen..." value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={2} />
              </div>
              <Button type="submit" className="w-full h-12" disabled={create.isPending}>
                {create.isPending ? "Wird gespeichert..." : "Schulung speichern"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Schulungsprotokoll</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-sm text-muted-foreground">Wird geladen...</div>
          ) : !records?.length ? (
            <div className="text-center py-12">
              <BookOpen className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Noch keine Schulungen dokumentiert</p>
            </div>
          ) : (
            <div className="space-y-3">
              {records.map((r) => (
                <div key={r.id} className="p-4 rounded-lg border bg-card">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm">{r.trainingTitle}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Trainer: {r.trainer}
                      </p>
                      {r.topics && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{r.topics}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-medium">
                        {new Date(r.trainingDate).toLocaleDateString("de-DE")}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {new Date(r.trainingDate).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })} Uhr
                      </p>
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
