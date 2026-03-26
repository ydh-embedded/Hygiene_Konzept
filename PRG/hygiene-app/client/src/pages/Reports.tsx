import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Download, FileText, Loader2 } from "lucide-react";

const REPORT_SECTIONS = [
  { id: "temperatures", label: "Temperaturmessungen" },
  { id: "checklists", label: "Checklisten-Erledigungen" },
  { id: "goodsReceipts", label: "Warenannahme-Protokolle" },
  { id: "cleaning", label: "Reinigungsbestätigungen" },
  { id: "pestControl", label: "Schädlingskontrollen" },
  { id: "training", label: "Schulungsnachweise" },
];

export default function Reports() {
  const today = new Date().toISOString().slice(0, 10);
  const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);

  const [dateFrom, setDateFrom] = useState(firstOfMonth);
  const [dateTo, setDateTo] = useState(today);
  const [sections, setSections] = useState<Set<string>>(new Set(REPORT_SECTIONS.map((s) => s.id)));
  const [isGenerating, setIsGenerating] = useState(false);

  const generateReport = trpc.reports.generate.useMutation({
    onSuccess: (data: { url: string; filename: string }) => {
      setIsGenerating(false);
      const link = document.createElement("a");
      link.href = data.url;
      link.download = data.filename;
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Bericht wurde erstellt und heruntergeladen");
    },
    onError: (e: { message: string }) => {
      setIsGenerating(false);
      toast.error("Fehler beim Erstellen: " + e.message);
    },
  });

  const toggleSection = (id: string) => {
    setSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleGenerate = () => {
    if (sections.size === 0) return toast.error("Mindestens einen Bereich auswählen");
    setIsGenerating(true);
    generateReport.mutate({
      dateFrom: new Date(dateFrom),
      dateTo: new Date(dateTo + "T23:59:59"),
      sections: Array.from(sections),
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">PDF-Berichte</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Dokumentation für Behördenprüfungen und Archivierung exportieren
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Konfiguration */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Bericht konfigurieren</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Von</Label>
                <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-12" />
              </div>
              <div className="space-y-2">
                <Label>Bis</Label>
                <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-12" />
              </div>
            </div>

            <div className="space-y-3">
              <Label>Enthaltene Bereiche</Label>
              {REPORT_SECTIONS.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => toggleSection(s.id)}
                >
                  <Checkbox
                    checked={sections.has(s.id)}
                    onCheckedChange={() => toggleSection(s.id)}
                    className="h-5 w-5"
                  />
                  <span className="text-sm font-medium">{s.label}</span>
                </div>
              ))}
            </div>

            <Button
              onClick={handleGenerate}
              disabled={isGenerating || sections.size === 0}
              className="w-full h-12 gap-2"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Bericht wird erstellt...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  PDF-Bericht erstellen
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Hinweise zum Bericht</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              {[
                {
                  icon: FileText,
                  title: "HACCP-konform",
                  desc: "Der Bericht entspricht den Anforderungen der EU-Verordnung (EG) Nr. 852/2004 und ist für Lebensmittelkontrolleure geeignet.",
                },
                {
                  icon: FileText,
                  title: "Vollständige Dokumentation",
                  desc: "Alle Messungen, Checklisten und Protokolle werden mit Zeitstempel, Mitarbeiter und Ergebnis aufgeführt.",
                },
                {
                  icon: FileText,
                  title: "Archivierung",
                  desc: "Gemäß HACCP-Anforderungen sollten Aufzeichnungen mindestens 2 Jahre aufbewahrt werden.",
                },
              ].map((item, i) => (
                <div key={i} className="flex gap-3 p-3 rounded-lg bg-muted/50">
                  <item.icon className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">{item.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3 rounded-lg border border-amber-200 bg-amber-50">
              <p className="text-xs text-amber-800">
                <strong>Tipp:</strong> Erstellen Sie monatliche Berichte und speichern Sie diese sicher ab. 
                Bei Behördenkontrollen können Sie so schnell alle erforderlichen Nachweise vorlegen.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
