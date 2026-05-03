import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuthTokens } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Users, Terminal, ArrowRight } from "lucide-react";

export default function Teams() {
  const [, setLocation] = useLocation();
  const { getToken } = useAuthTokens();
  const { toast } = useToast();

  useEffect(() => {
    if (getToken()) setLocation("/watch");
  }, []);

  const goToHome = () => setLocation("/");

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Users className="w-5 h-5" /> Team Access</CardTitle>
          <CardDescription>Team access is linked through participant codes and the watch screen.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Terminal className="w-4 h-4" />
            Use the home page login to enter your participant, judge, or admin code.
          </div>
          <Button className="w-full" onClick={goToHome}>
            Go to Home <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
          <p className="text-xs text-muted-foreground">If you already logged in, you will be redirected to your role automatically.</p>
        </CardContent>
      </Card>
    </div>
  );
}
