import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { CheckCircle2, CheckSquare, Clock, Plus } from "lucide-react";

type Frequency = "daily" | "weekly" | "monthly";

const FREQ_LABELS: Record<Frequency, string> = {
  daily: "Täglich",
  weekly: "Wöchentlich",
  monthly: "Monatlich",
};

export default function Checklists() {
  const [activeTab, setActiveTab] = useState<Frequency>("daily");
  const [selectedChecklist, setSelectedChecklist] = useState<number | null>(null);
  const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set());
  const [notes, setNotes] = useState("");
  const [fillOpen, setFillOpen] = useState(false);

  const utils = trpc.useUtils();
  const { data: checklists } = trpc.checklists.list.useQuery({ frequency: activeTab });
  const { data: checklistDetail } = trpc.checklists.get.useQuery(
    { id: selectedChecklist! },
    { enabled: selectedChecklist !== null }
  );

  const complete = trpc.checklists.complete.useMutation({
    onSuccess: () => {
      utils.checklists.list.invalidate();
      utils.checklists.completions.invalidate();
      utils.dashboard.stats.invalidate();
      toast.success("Checkliste abgeschlossen");
      setFillOpen(false);
      setCheckedItems(new Set());
      setNotes("");
      setSelectedChecklist(null);
    },
    onError: (e) => toast.error("Fehler: " + e.message),
  });

  const handleOpenChecklist = (id: number) => {
    setSelectedChecklist(id);
    setCheckedItems(new Set());
    setNotes("");
    setFillOpen(true);
  };

  const handleToggleItem = (itemId: number) => {
    setCheckedItems((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };

  const handleSubmit = () => {
    if (!checklistDetail) return;
    complete.mutate({
      checklistId: checklistDetail.id,
      completedItems: Array.from(checkedItems),
      notes: notes || undefined,
      totalItems: checklistDetail.items.length,
    });
  };

  const allRequired = checklistDetail?.items.filter((i) => i.isRequired) ?? [];
  const allRequiredDone = allRequired.every((i) => checkedItems.has(i.id));
  const progress = checklistDetail
    ? Math.round((checkedItems.size / Math.max(checklistDetail.items.length, 1)) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Checklisten</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Hygiene- und Reinigungskontrollen</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as Frequency)}>
        <TabsList className="w-full sm:w-auto">
          {(["daily", "weekly", "monthly"] as Frequency[]).map((f) => (
            <TabsTrigger key={f} value={f} className="flex-1 sm:flex-none">
              {FREQ_LABELS[f]}
            </TabsTrigger>
          ))}
        </TabsList>

        {(["daily", "weekly", "monthly"] as Frequency[]).map((f) => (
          <TabsContent key={f} value={f} className="mt-4">
            {!checklists?.length ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <CheckSquare className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">Keine {FREQ_LABELS[f].toLowerCase()}en Checklisten vorhanden</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3">
                {checklists.map((cl) => (
                  <Card key={cl.id} className="hover:shadow-md transition-all cursor-pointer" onClick={() => handleOpenChecklist(cl.id)}>
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <CheckSquare className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm">{cl.title}</p>
                        {cl.description && (
                          <p className="text-xs text-muted-foreground truncate mt-0.5">{cl.description}</p>
                        )}
                        {cl.category && (
                          <Badge variant="secondary" className="text-[10px] mt-1">{cl.category}</Badge>
                        )}
                      </div>
                      <Button size="sm" variant="outline" className="shrink-0">
                        Ausfüllen
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Checkliste ausfüllen Dialog */}
      <Dialog open={fillOpen} onOpenChange={setFillOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{checklistDetail?.title ?? "Checkliste"}</DialogTitle>
          </DialogHeader>

          {checklistDetail && (
            <div className="space-y-4 mt-2">
              {/* Fortschritt */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{checkedItems.size} von {checklistDetail.items.length} erledigt</span>
                  <span>{progress}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent rounded-full transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              {/* Items */}
              <div className="space-y-2">
                {checklistDetail.items.map((item) => (
                  <div
                    key={item.id}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      checkedItems.has(item.id) ? "bg-emerald-50 border-emerald-200" : "bg-card hover:bg-muted/50"
                    }`}
                    onClick={() => handleToggleItem(item.id)}
                  >
                    <Checkbox
                      checked={checkedItems.has(item.id)}
                      onCheckedChange={() => handleToggleItem(item.id)}
                      className="mt-0.5 h-5 w-5"
                    />
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${checkedItems.has(item.id) ? "line-through text-muted-foreground" : ""}`}>
                        {item.label}
                        {item.isRequired && <span className="text-destructive ml-1">*</span>}
                      </p>
                      {item.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                      )}
                    </div>
                    {checkedItems.has(item.id) && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    )}
                  </div>
                ))}
              </div>

              {/* Notizen */}
              <div className="space-y-2">
                <Label>Notizen (optional)</Label>
                <Textarea
                  placeholder="Auffälligkeiten, Abweichungen..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                />
              </div>

              {!allRequiredDone && (
                <p className="text-xs text-amber-600 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  Pflichtpunkte (markiert mit *) müssen abgehakt werden.
                </p>
              )}

              <Button
                onClick={handleSubmit}
                disabled={!allRequiredDone || complete.isPending}
                className="w-full h-12"
              >
                {complete.isPending ? "Wird gespeichert..." : "Checkliste abschließen"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
