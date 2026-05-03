import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuthTokens } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Users, Terminal } from "lucide-react";

export default function Teams() {
  const [, setLocation] = useLocation();
  const { getToken } = useAuthTokens();
  const { toast } = useToast();
  const [teamCode, setTeamCode] = useState("");

  useEffect(() => {
    if (getToken()) setLocation("/watch");
  }, []);

  const handleDummyTeamAuth = async () => {
    try {
      const res = await fetch("/api/teams/with-dummy-auth", {
        headers: { Authorization: `Bearer ${localStorage.getItem("hackforge_token") ?? ""}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Team auth unavailable");
      toast({ title: "Team access loaded", description: "Using dummy team auth" });
      setLocation("/watch");
    } catch (err: unknown) {
      toast({ title: "Team auth unavailable", description: err instanceof Error ? err.message : "Failed", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Users className="w-5 h-5" /> Team Dummy Auth</CardTitle>
          <CardDescription>Temporary team auth is mapped to participant code sessions.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><Terminal className="w-4 h-4" /> Team auth pending: use participant code login for now</div>
          <Input value={teamCode} onChange={(e) => setTeamCode(e.target.value)} placeholder="Enter participant code" />
          <Button className="w-full" onClick={handleDummyTeamAuth}>Load Team Session</Button>
          <p className="text-xs text-muted-foreground">This screen is only a dummy placeholder while team registration identity is being finalized.</p>
        </CardContent>
      </Card>
    </div>
  );
}
