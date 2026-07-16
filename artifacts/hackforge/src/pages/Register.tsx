import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Mail, Phone, Hash, Terminal, CheckCircle2, ArrowRight, ArrowLeft, Zap, Trophy, CreditCard, Smartphone } from "lucide-react";

interface ActiveHackathon {
  id: number; name: string; slug: string; tagline: string | null;
  prizePool: string | null; grandPrize: string | null; phase: string;
}

const PAYMENT_MODES = [
  { value: "upi", label: "UPI", icon: Smartphone, desc: "Google Pay, PhonePe, Paytm, etc." },
  { value: "online", label: "Online Payment", icon: CreditCard, desc: "Card / Net Banking (coming soon)" },
];

export default function Register() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState<"form" | "success">("form");
  const [loading, setLoading] = useState(false);
  const [hackathon, setHackathon] = useState<ActiveHackathon | null>(null);
  const [regId, setRegId] = useState<number | null>(null);

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    teamName: "",
    phone: "",
    memberCount: 1,
    paymentMode: "upi",
    notes: "",
  });

  const [teamMembers, setTeamMembers] = useState<Array<{ fullName: string; email: string; phone: string }>>([
    { fullName: "", email: "", phone: "" }
  ]);

  useEffect(() => {
    fetch("/api/hackathons/active")
      .then((r) => r.json())
      .then((d) => { if (d.id) setHackathon(d); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    setTeamMembers((prev) => {
      const newArr = [...prev];
      while (newArr.length < form.memberCount) {
        newArr.push({ fullName: "", email: "", phone: "" });
      }
      return newArr.slice(0, form.memberCount);
    });
  }, [form.memberCount]);

  const set = (k: string, v: string | number) => setForm((p) => ({ ...p, [k]: v }));

  const updateMember = (idx: number, field: "fullName" | "email" | "phone", value: string) => {
    setTeamMembers((prev) => prev.map((m, i) => i === idx ? { ...m, [field]: value } : m));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fullName || !form.email || !form.teamName) {
      toast({ title: "Missing fields", description: "Name, email, and team name are required.", variant: "destructive" });
      return;
    }
    if (form.fullName.length < 2) {
      toast({ title: "Name too short", description: "Full name must be at least 2 characters.", variant: "destructive" });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      toast({ title: "Invalid email", variant: "destructive" });
      return;
    }
    if (form.memberCount > 1) {
      for (let i = 1; i < teamMembers.length; i++) {
        if (!teamMembers[i].fullName || teamMembers[i].fullName.length < 2) {
          toast({ title: "Missing member details", description: `Member ${i + 1} needs a full name.`, variant: "destructive" });
          return;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(teamMembers[i].email)) {
          toast({ title: "Invalid email", description: `Member ${i + 1} has an invalid email.`, variant: "destructive" });
          return;
        }
      }
    }
    setLoading(true);
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          teamMembers: form.memberCount > 1 ? teamMembers.map((m, i) =>
            i === 0 ? { fullName: form.fullName, email: form.email, phone: form.phone } : m
          ) : null,
          hackathonId: hackathon?.id ?? null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Registration failed");
      setRegId(data.id);
      setStep("success");
    } catch (err: unknown) {
      toast({ title: "Registration failed", description: err instanceof Error ? err.message : "Try again", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (step === "success") {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-6 bg-background">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md text-center space-y-6">
          <div className="flex justify-center">
            <div className="bg-chart-3/10 p-5 rounded-full border border-chart-3/20">
              <CheckCircle2 className="w-12 h-12 text-chart-3" />
            </div>
          </div>
          <div>
            <h2 className="font-mono text-2xl font-bold text-chart-3">REGISTERED!</h2>
            <p className="text-muted-foreground mt-2">Your registration #{regId} has been submitted.</p>
          </div>
          <Card className="border-chart-3/20 bg-chart-3/5 text-left">
            <CardContent className="pt-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-chart-3/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-chart-3 text-xs font-bold">1</span>
                </div>
                <div>
                  <p className="font-semibold text-sm">Payment Verification</p>
                  <p className="text-xs text-muted-foreground">
                    Complete your UPI payment and share the screenshot with the organizer.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-chart-3/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-chart-3 text-xs font-bold">2</span>
                </div>
                <div>
                  <p className="font-semibold text-sm">Admin Approval</p>
                  <p className="text-xs text-muted-foreground">Admin will verify and generate your unique access code.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-chart-3/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-chart-3 text-xs font-bold">3</span>
                </div>
                <div>
                  <p className="font-semibold text-sm">Get Your Code</p>
                  <p className="text-xs text-muted-foreground">Your <span className="font-mono text-primary">HACKAEGIS_PART_XXXXXXXX</span> code will be shared with you via email.</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setLocation("/")}>
              <ArrowLeft className="w-4 h-4 mr-2" /> Back Home
            </Button>
            <Button className="flex-1" onClick={() => { setStep("form"); setForm({ fullName: "", email: "", teamName: "", phone: "", memberCount: 1, paymentMode: "upi", notes: "" }); setTeamMembers([{ fullName: "", email: "", phone: "" }]); }}>
              Register Another
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background py-10 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium">
            <Terminal className="w-4 h-4" />
            {hackathon ? hackathon.name : "HackAegis"}
          </div>
          <h1 className="text-3xl font-bold">Register for the Hackathon</h1>
          <p className="text-muted-foreground">Fill in your details to get started. Admin will verify and assign your access code.</p>
          {hackathon && (
            <div className="flex gap-2 justify-center flex-wrap mt-2">
              {hackathon.prizePool && <Badge variant="outline" className="gap-1"><Trophy className="w-3 h-3" /> {hackathon.prizePool} Pool</Badge>}
              {hackathon.grandPrize && <Badge variant="outline" className="gap-1"><Zap className="w-3 h-3" /> {hackathon.grandPrize} Grand Prize</Badge>}
            </div>
          )}
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="font-mono text-base">TEAM REGISTRATION FORM</CardTitle>
              <CardDescription>All fields marked with * are required</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Personal Info */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Team Leader / Contact Person</p>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> Full Name *</label>
                      <Input value={form.fullName} onChange={(e) => set("fullName", e.target.value)} placeholder="Your full name" required />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> Email *</label>
                      <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="you@example.com" required />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> Phone</label>
                      <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+91 98765 43210" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium flex items-center gap-1.5"><Hash className="w-3.5 h-3.5" /> Team Size *</label>
                      <select
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                        value={form.memberCount}
                        onChange={(e) => set("memberCount", parseInt(e.target.value, 10))}
                      >
                        {[1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n} member{n !== 1 ? "s" : ""}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Dynamic Team Members */}
                {form.memberCount > 1 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Team Members</p>
                    <div className="space-y-3">
                      {teamMembers.map((member, idx) => (
                        <div key={idx} className="p-3 rounded-lg border border-border bg-muted/20">
                          <p className="text-xs font-medium mb-2 text-primary">
                            Member {idx + 1} {idx === 0 && "(Team Leader — auto-filled)"}
                          </p>
                          <div className="grid sm:grid-cols-3 gap-3">
                            <Input
                              value={idx === 0 ? form.fullName : member.fullName}
                              onChange={(e) => updateMember(idx, "fullName", e.target.value)}
                              placeholder="Full Name *"
                              disabled={idx === 0}
                              required={idx !== 0}
                            />
                            <Input
                              type="email"
                              value={idx === 0 ? form.email : member.email}
                              onChange={(e) => updateMember(idx, "email", e.target.value)}
                              placeholder="Email *"
                              disabled={idx === 0}
                              required={idx !== 0}
                            />
                            <Input
                              value={idx === 0 ? form.phone : member.phone}
                              onChange={(e) => updateMember(idx, "phone", e.target.value)}
                              placeholder="Phone"
                              disabled={idx === 0}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Team Info */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Team Information</p>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Team Name *</label>
                    <Input value={form.teamName} onChange={(e) => set("teamName", e.target.value)} placeholder="Your team name" required />
                  </div>
                </div>

                {/* Payment Mode */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Payment Preference</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {PAYMENT_MODES.map((mode) => (
                      <button
                        key={mode.value}
                        type="button"
                        onClick={() => set("paymentMode", mode.value)}
                        className={`flex flex-col items-start gap-1 p-3 rounded-lg border text-left transition-all ${form.paymentMode === mode.value ? "border-primary bg-primary/5 text-primary" : "border-border hover:border-primary/40"} ${mode.value === "online" ? "opacity-60 cursor-not-allowed" : ""}`}
                        disabled={mode.value === "online"}
                      >
                        <mode.icon className="w-4 h-4" />
                        <span className="text-sm font-medium">{mode.label}</span>
                        <span className="text-xs text-muted-foreground">{mode.desc}</span>
                        {mode.value === "online" && <Badge variant="secondary" className="text-xs mt-1">Coming Soon</Badge>}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Notes */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Additional Notes (optional)</label>
                  <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Any questions or special requirements..." rows={2} className="resize-none" />
                </div>

                <div className="pt-2 flex gap-3">
                  <Button type="button" variant="outline" onClick={() => setLocation("/")} className="gap-1">
                    <ArrowLeft className="w-4 h-4" /> Back
                  </Button>
                  <Button type="submit" className="flex-1 gap-2" disabled={loading}>
                    {loading ? <span className="flex items-center gap-2">Submitting<span className="animate-pulse">...</span></span> : <><ArrowRight className="w-4 h-4" /> Submit Registration</>}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </motion.div>

        <p className="text-center text-xs text-muted-foreground">
          Already have a code?{" "}
          <button className="text-primary hover:underline font-medium" onClick={() => setLocation("/")}>Login here</button>
        </p>
      </div>
    </div>
  );
}
