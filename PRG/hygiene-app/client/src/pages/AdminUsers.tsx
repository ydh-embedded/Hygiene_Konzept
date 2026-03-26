import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Shield, User, Users } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { useEffect } from "react";

export default function AdminUsers() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (user && user.role !== "admin") {
      setLocation("/");
      toast.error("Kein Zugriff – nur für Administratoren");
    }
  }, [user, setLocation]);

  const utils = trpc.useUtils();
  const { data: users, isLoading } = trpc.users.list.useQuery();

  const setRole = trpc.users.setRole.useMutation({
    onSuccess: () => {
      utils.users.list.invalidate();
      toast.success("Rolle aktualisiert");
    },
    onError: (e: { message: string }) => toast.error("Fehler: " + e.message),
  });

  if (user?.role !== "admin") return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Benutzerverwaltung</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Mitarbeiter und Rollen verwalten</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="w-4 h-4" />
            Alle Benutzer ({users?.length ?? 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-sm text-muted-foreground">Wird geladen...</div>
          ) : !users?.length ? (
            <div className="text-center py-12">
              <Users className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Keine Benutzer gefunden</p>
            </div>
          ) : (
            <div className="space-y-2">
              {users.map((u) => (
                <div key={u.id} className="flex items-center gap-4 p-4 rounded-lg border bg-card">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                    u.role === "admin" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                  }`}>
                    {u.name?.charAt(0).toUpperCase() ?? "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">{u.name ?? "Unbekannt"}</p>
                    <p className="text-xs text-muted-foreground">{u.email ?? "–"}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant={u.role === "admin" ? "default" : "secondary"} className="text-xs">
                      {u.role === "admin" ? "Administrator" : "Mitarbeiter"}
                    </Badge>
                    {u.id !== user?.id && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setRole.mutate({ userId: u.id, role: u.role === "admin" ? "user" : "admin" })}
                        disabled={setRole.isPending}
                        className="text-xs"
                      >
                        {u.role === "admin" ? "Zu Mitarbeiter" : "Zu Admin"}
                      </Button>
                    )}
                    {u.id === user?.id && (
                      <span className="text-xs text-muted-foreground">(Sie)</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <Shield className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-800">Hinweis zur Rollenverwaltung</p>
              <p className="text-xs text-amber-700 mt-1">
                Administratoren haben vollen Zugriff auf alle Funktionen und können Benutzerrollen verwalten. 
                Mitarbeiter können Daten erfassen, aber keine administrativen Änderungen vornehmen.
                Neue Benutzer erhalten nach der Anmeldung automatisch die Rolle "Mitarbeiter".
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
