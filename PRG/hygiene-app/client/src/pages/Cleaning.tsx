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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { CheckCircle2, Plus, Wrench } from "lucide-react";

type Frequency = "daily" | "weekly" | "monthly";
const FREQ_LABELS: Record<Frequency, string> = { daily: "Täglich", weekly: "Wöchentlich", monthly: "Monatlich" };

export default function Cleaning() {
  const [activeTab, setActiveTab] = useState<Frequency>("daily");
  const [newPlanOpen, setNewPlanOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [confirmNotes, setConfirmNotes] = useState("");

  const [planForm, setPlanForm] = useState({
    area: "", task: "", frequency: "daily" as Frequency,
    cleaningAgent: "", assignedTo: "",
  });

  const utils = trpc.useUtils();
  const { data: plans } = trpc.cleaning.plans.useQuery({ frequency: activeTab });
  const { data: completions } = trpc.cleaning.completions.useQuery({ limit: 50 });

  const createPlan = trpc.cleaning.createPlan.useMutation({
    onSuccess: () => {
      utils.cleaning.plans.invalidate();
      toast.success("Reinigungsaufgabe erstellt");
      setNewPlanOpen(false);
      setPlanForm({ area: "", task: "", frequency: "daily", cleaningAgent: "", assignedTo: "" });
    },
    onError: (e) => toast.error("Fehler: " + e.message),
  });

  const complete = trpc.cleaning.complete.useMutation({
    onSuccess: () => {
      utils.cleaning.completions.invalidate();
      toast.success("Reinigung bestätigt");
      setConfirmOpen(false);
      setConfirmNotes("");
      setSelectedPlanId(null);
    },
    onError: (e) => toast.error("Fehler: " + e.message),
  });

  const handleConfirm = (planId: number) => {
    setSelectedPlanId(planId);
    setConfirmNotes("");
    setConfirmOpen(true);
  };

  const handleSubmitConfirm = () => {
    if (!selectedPlanId) return;
    complete.mutate({ cleaningPlanId: selectedPlanId, notes: confirmNotes || undefined });
  };

  const handleCreatePlan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!planForm.area.trim() || !planForm.task.trim()) return toast.error("Bereich und Aufgabe angeben");
    createPlan.mutate({
      area: planForm.area,
      task: planForm.task,
      frequency: planForm.frequency,
      cleaningAgent: planForm.cleaningAgent || undefined,
    });
  };

  const selectedPlan = plans?.find((p) => p.id === selectedPlanId);

  // Letzte Bestätigungen als Set für schnellen Lookup
  const todayCompletedPlanIds = new Set(
    completions
      ?.filter((c) => {
        const d = new Date(c.completedAt);
        const today = new Date();
        return d.toDateString() === today.toDateString();
      })
      .map((c) => c.cleaningPlanId)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Reinigungspläne</h1>
          <p className="text-sm text-muted-foreground mt-0.5">QP 10 & QP 11 – Tägliche, wöchentliche und monatliche Reinigung</p>
        </div>
        <Dialog open={newPlanOpen} onOpenChange={setNewPlanOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Aufgabe anlegen
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Neue Reinigungsaufgabe</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreatePlan} className="space-y-4 mt-2">
              <div className="space-y-2">
                <Label>Bereich *</Label>
                <Input placeholder="z.B. Küche, Toiletten, Lager" value={planForm.area}
                  onChange={(e) => setPlanForm((f) => ({ ...f, area: e.target.value }))} className="h-12" />
              </div>
              <div className="space-y-2">
                <Label>Aufgabe *</Label>
                <Input placeholder="z.B. Boden wischen, Oberflächen desinfizieren" value={planForm.task}
                  onChange={(e) => setPlanForm((f) => ({ ...f, task: e.target.value }))} className="h-12" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Häufigkeit</Label>
                  <Select value={planForm.frequency} onValueChange={(v) => setPlanForm((f) => ({ ...f, frequency: v as Frequency }))}>
                    <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(["daily", "weekly", "monthly"] as Frequency[]).map((f) => (
                        <SelectItem key={f} value={f}>{FREQ_LABELS[f]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Reinigungsmittel</Label>
                  <Input placeholder="Optional" value={planForm.cleaningAgent}
                    onChange={(e) => setPlanForm((f) => ({ ...f, cleaningAgent: e.target.value }))} className="h-12" />
                </div>
              </div>
              <Button type="submit" className="w-full h-12" disabled={createPlan.isPending}>
                {createPlan.isPending ? "Wird gespeichert..." : "Aufgabe erstellen"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as Frequency)}>
        <TabsList className="w-full sm:w-auto">
          {(["daily", "weekly", "monthly"] as Frequency[]).map((f) => (
            <TabsTrigger key={f} value={f} className="flex-1 sm:flex-none">{FREQ_LABELS[f]}</TabsTrigger>
          ))}
        </TabsList>
        {(["daily", "weekly", "monthly"] as Frequency[]).map((f) => (
          <TabsContent key={f} value={f} className="mt-4">
            {!plans?.length ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Wrench className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">Keine {FREQ_LABELS[f].toLowerCase()}en Aufgaben vorhanden</p>
                  <p className="text-xs text-muted-foreground mt-1">Legen Sie Reinigungsaufgaben mit dem Button oben an.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {plans.map((plan) => {
                  const isDoneToday = todayCompletedPlanIds.has(plan.id);
                  return (
                    <div key={plan.id} className={`p-4 rounded-xl border flex items-center gap-4 ${isDoneToday ? "bg-emerald-50 border-emerald-200" : "bg-card"}`}>
                      <div className={`p-2 rounded-lg ${isDoneToday ? "bg-emerald-100" : "bg-muted"}`}>
                        {isDoneToday
                          ? <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                          : <Wrench className="w-5 h-5 text-muted-foreground" />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm">{plan.area}</span>
                          <Badge variant="secondary" className="text-[10px]">{FREQ_LABELS[plan.frequency]}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{plan.task}</p>
                        {plan.cleaningAgent && (
                          <p className="text-[10px] text-muted-foreground mt-0.5">Mittel: {plan.cleaningAgent}</p>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant={isDoneToday ? "outline" : "default"}
                        onClick={() => handleConfirm(plan.id)}
                        className="shrink-0"
                      >
                        {isDoneToday ? "Erneut" : "Erledigt"}
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Bestätigungs-Dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Reinigung bestätigen</DialogTitle>
          </DialogHeader>
          {selectedPlan && (
            <div className="space-y-4 mt-2">
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="font-medium text-sm">{selectedPlan.area}</p>
                <p className="text-xs text-muted-foreground mt-1">{selectedPlan.task}</p>
              </div>
              <div className="space-y-2">
                <Label>Notizen (optional)</Label>
                <Textarea placeholder="Auffälligkeiten, Mängel..." value={confirmNotes}
                  onChange={(e) => setConfirmNotes(e.target.value)} rows={2} />
              </div>
              <Button onClick={handleSubmitConfirm} className="w-full h-12" disabled={complete.isPending}>
                {complete.isPending ? "Wird gespeichert..." : "Reinigung bestätigen"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
