import { useState, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Shield,
  Gavel,
  Users,
  Key,
  Copy,
  Check,
  Search,
  Download,
  RefreshCw,
  Lock,
  Unlock,
  ClipboardList,
  Video,
  ShieldCheck,
  Activity,
  UserCheck,
  Clock,
  Info,
} from "lucide-react";
import { useAdminFetch, adminApi } from "../lib/api";
import StatCard from "../components/shared/StatCard";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AdminCode {
  id: number;
  code: string;
  label: string;
  isReusable: boolean;
}

interface JudgeCode {
  id: number;
  code: string;
  label: string;
  isReusable: boolean;
  domain?: string;
}

interface ParticipantCode {
  id: number;
  code: string;
  label: string;
  isUsed: boolean;
  teamId: number | null;
}

interface RegistrationEntry {
  id: number;
  fullName: string;
  email: string;
  teamName: string;
  paymentStatus: string;
  participantCode: string | null;
}

interface AccessPortalData {
  adminCodes: AdminCode[];
  judgeCodes: JudgeCode[];
  participantCodes: ParticipantCode[];
  registrations: RegistrationEntry[];
  summary: {
    totalAdmin: number;
    totalJudges: number;
    totalParticipants: number;
    totalRegistrations: number;
    pendingRegistrations: number;
    approvedRegistrations: number;
  };
}

interface TeamCodeData {
  teamLoginCode: { id: number; code: string; label: string | null } | null;
  meetCodes: Array<{ id: number; code: string; label: string | null; isUsed: boolean }>;
}

interface TeamEntry {
  id: number;
  name: string;
  projectTitle: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function downloadCSV(csv: string, filename: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

// ─── Copy Button Component ────────────────────────────────────────────────────

function CopyButton({ text, size = "sm" }: { text: string; size?: "sm" | "icon" }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (size === "icon") {
    return (
      <button
        onClick={handleCopy}
        className="ml-1.5 text-muted-foreground hover:text-foreground transition-colors"
        title="Copy to clipboard"
      >
        {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
      </button>
    );
  }

  return (
    <Button variant="ghost" size="sm" className="h-7 px-2" onClick={handleCopy}>
      {copied ? (
        <>
          <Check className="w-3.5 h-3.5 mr-1 text-green-500" />
          <span className="text-xs text-green-500">Copied!</span>
        </>
      ) : (
        <>
          <Copy className="w-3.5 h-3.5 mr-1" />
          <span className="text-xs">Copy</span>
        </>
      )}
    </Button>
  );
}

// ─── Copy All Button ──────────────────────────────────────────────────────────

function CopyAllButton({ codes, label }: { codes: string[]; label: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopyAll = () => {
    navigator.clipboard.writeText(codes.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button variant="outline" size="sm" onClick={handleCopyAll} disabled={codes.length === 0}>
      {copied ? (
        <>
          <Check className="w-4 h-4 mr-2 text-green-500" />
          Copied {codes.length}!
        </>
      ) : (
        <>
          <ClipboardList className="w-4 h-4 mr-2" />
          {label} ({codes.length})
        </>
      )}
    </Button>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AccessPortalSection() {
  const { data: portalData, loading, refetch } = useAdminFetch<AccessPortalData>("/api/admin/access-portal");
  const { data: teams } = useAdminFetch<TeamEntry[]>("/api/teams");

  // Credential tab state
  const [credentialTab, setCredentialTab] = useState("admin");

  // Participant filter
  const [participantFilter, setParticipantFilter] = useState<"all" | "used" | "available">("all");

  // Team access search
  const [teamSearchQuery, setTeamSearchQuery] = useState("");
  const [teamStatusFilter, setTeamStatusFilter] = useState<"all" | "approved" | "pending" | "rejected">("all");

  // Meeting access state
  const [selectedTeamId, setSelectedTeamId] = useState<string>("");
  const [teamCodes, setTeamCodes] = useState<TeamCodeData | null>(null);
  const [teamCodesLoading, setTeamCodesLoading] = useState(false);
  const [regenerating, setRegenerating] = useState<"login" | "meet" | null>(null);

  const summary = portalData?.summary;
  const adminCodes = portalData?.adminCodes ?? [];
  const judgeCodes = portalData?.judgeCodes ?? [];
  const participantCodes = portalData?.participantCodes ?? [];
  const registrations = portalData?.registrations ?? [];

  // Computed values
  const usedCodesCount = participantCodes.filter((c) => c.isUsed).length;
  const availableCodesCount = participantCodes.filter((c) => !c.isUsed).length;

  // Filtered participant codes
  const filteredParticipantCodes = useMemo(() => {
    if (participantFilter === "used") return participantCodes.filter((c) => c.isUsed);
    if (participantFilter === "available") return participantCodes.filter((c) => !c.isUsed);
    return participantCodes;
  }, [participantCodes, participantFilter]);

  // Team access registration data
  const filteredRegistrations = useMemo(() => {
    let result = registrations;

    if (teamSearchQuery.trim()) {
      const q = teamSearchQuery.toLowerCase();
      result = result.filter(
        (r) =>
          r.teamName.toLowerCase().includes(q) ||
          r.fullName.toLowerCase().includes(q) ||
          r.email.toLowerCase().includes(q)
      );
    }

    if (teamStatusFilter !== "all") {
      result = result.filter((r) => {
        if (teamStatusFilter === "approved") return !!r.participantCode;
        if (teamStatusFilter === "pending") return !r.participantCode && r.paymentStatus !== "rejected";
        if (teamStatusFilter === "rejected") return r.paymentStatus === "rejected";
        return true;
      });
    }

    return result;
  }, [registrations, teamSearchQuery, teamStatusFilter]);

  // Fetch team codes
  const fetchTeamCodes = useCallback(async (teamId: string) => {
    if (!teamId) return;
    setTeamCodesLoading(true);
    setTeamCodes(null);
    try {
      const data = await adminApi("GET", `/api/codes/team/${teamId}`);
      setTeamCodes(data);
    } catch (e) {
      console.error("Failed to fetch team codes:", e);
    } finally {
      setTeamCodesLoading(false);
    }
  }, []);

  const handleTeamSelect = (teamId: string) => {
    setSelectedTeamId(teamId);
    if (teamId) fetchTeamCodes(teamId);
  };

  const handleRegenerateLogin = async () => {
    if (!selectedTeamId) return;
    setRegenerating("login");
    try {
      await adminApi("POST", "/api/codes/team-login", { teamId: parseInt(selectedTeamId) });
      await fetchTeamCodes(selectedTeamId);
    } catch (e) {
      console.error("Failed to regenerate login code:", e);
    } finally {
      setRegenerating(null);
    }
  };

  const handleRegenerateMeet = async () => {
    if (!selectedTeamId) return;
    setRegenerating("meet");
    try {
      await adminApi("POST", "/api/codes/meet", { teamId: parseInt(selectedTeamId) });
      await fetchTeamCodes(selectedTeamId);
    } catch (e) {
      console.error("Failed to regenerate meet codes:", e);
    } finally {
      setRegenerating(null);
    }
  };

  // Export credentials CSV
  const handleExportCSV = () => {
    const rows: string[][] = [];
    rows.push(["Role", "Code", "Label", "Status", "Team"]);

    adminCodes.forEach((c) => {
      rows.push(["Admin", c.code, c.label, "reusable", ""]);
    });

    judgeCodes.forEach((c) => {
      rows.push(["Judge", c.code, c.label, "reusable", ""]);
    });

    participantCodes.forEach((c) => {
      rows.push([
        "Participant",
        c.code,
        c.label || "",
        c.isUsed ? "used" : "available",
        c.teamId ? String(c.teamId) : "",
      ]);
    });

    const csv = rows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")).join("\n");
    downloadCSV(csv, `hackaegis_credentials_${new Date().toISOString().split("T")[0]}.csv`);
  };

  // Registration status helper
  const getRegStatus = (reg: RegistrationEntry) => {
    if (reg.participantCode) return "approved";
    if (reg.paymentStatus === "rejected") return "rejected";
    return "pending";
  };

  if (loading && !portalData) {
    return (
      <div className="space-y-4">
        <div className="h-10 bg-muted/30 rounded-lg animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-24 bg-muted/30 rounded-lg animate-pulse" />
          ))}
        </div>
        <div className="h-64 bg-muted/30 rounded-lg animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Access Portal</h2>
          <p className="text-sm text-muted-foreground">
            Centralized authentication, credential monitoring, and session management
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <Download className="w-4 h-4 mr-2" />
            Export All Credentials
          </Button>
        </div>
      </div>

      {/* ─── Portal Overview ──────────────────────────────────────────────── */}
      <section>
        <h3 className="text-sm font-semibold uppercase text-muted-foreground mb-3">Portal Overview</h3>
        <motion.div
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <StatCard
            label="Admin Codes"
            value={summary?.totalAdmin ?? 0}
            icon={Shield}
            color="text-red-500"
          />
          <StatCard
            label="Judge Codes"
            value={summary?.totalJudges ?? 0}
            icon={Gavel}
            color="text-purple-500"
          />
          <StatCard
            label="Participant Codes"
            value={summary?.totalParticipants ?? 0}
            icon={Users}
            color="text-blue-500"
          />
          <StatCard
            label="Used / Available"
            value={`${usedCodesCount}/${availableCodesCount}`}
            icon={Key}
            color="text-chart-4"
            subtitle={`${participantCodes.length > 0 ? Math.round((usedCodesCount / participantCodes.length) * 100) : 0}% utilization`}
          />
          <StatCard
            label="Pending Registrations"
            value={summary?.pendingRegistrations ?? 0}
            icon={Clock}
            color="text-orange-500"
          />
          <StatCard
            label="Approved Registrations"
            value={summary?.approvedRegistrations ?? 0}
            icon={UserCheck}
            color="text-green-500"
          />
        </motion.div>
      </section>

      {/* ─── Credential Management ────────────────────────────────────────── */}
      <section>
        <h3 className="text-sm font-semibold uppercase text-muted-foreground mb-3">Credential Management</h3>
        <Card>
          <CardContent className="pt-4">
            <Tabs value={credentialTab} onValueChange={setCredentialTab}>
              <TabsList className="w-full sm:w-auto grid grid-cols-3 sm:inline-flex">
                <TabsTrigger value="admin" className="gap-1.5 text-xs sm:text-sm">
                  <Shield className="w-3 h-3" />
                  Admin
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
                    {adminCodes.length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="judges" className="gap-1.5 text-xs sm:text-sm">
                  <Gavel className="w-3 h-3" />
                  Judges
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
                    {judgeCodes.length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="participants" className="gap-1.5 text-xs sm:text-sm">
                  <Users className="w-3 h-3" />
                  Participants
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
                    {participantCodes.length}
                  </Badge>
                </TabsTrigger>
              </TabsList>

              {/* Admin Codes Tab */}
              <TabsContent value="admin" className="mt-4">
                <div className="flex justify-end mb-3">
                  <CopyAllButton codes={adminCodes.map((c) => c.code)} label="Copy All" />
                </div>
                <div className="space-y-2">
                  {adminCodes.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">No admin codes found.</p>
                  ) : (
                    adminCodes.map((code) => (
                      <div
                        key={code.id}
                        className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Badge className="bg-red-500/15 text-red-600 border-red-500/30 shrink-0">
                            ADMIN
                          </Badge>
                          <span className="text-sm font-medium truncate">{code.label}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <code className="text-xs font-mono bg-muted px-2 py-1 rounded">
                            {code.code}
                          </code>
                          <CopyButton text={code.code} size="icon" />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </TabsContent>

              {/* Judge Codes Tab */}
              <TabsContent value="judges" className="mt-4">
                <div className="flex justify-end mb-3">
                  <CopyAllButton codes={judgeCodes.map((c) => c.code)} label="Copy All" />
                </div>
                <div className="space-y-2">
                  {judgeCodes.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">No judge codes found.</p>
                  ) : (
                    judgeCodes.map((code) => (
                      <div
                        key={code.id}
                        className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Badge className="bg-purple-500/15 text-purple-600 border-purple-500/30 shrink-0">
                            JUDGE
                          </Badge>
                          <span className="text-sm font-medium truncate">{code.label}</span>
                          {code.domain && (
                            <Badge variant="outline" className="text-[10px] shrink-0">
                              {code.domain}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <code className="text-xs font-mono bg-muted px-2 py-1 rounded">
                            {code.code}
                          </code>
                          <CopyButton text={code.code} size="icon" />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </TabsContent>

              {/* Participant Codes Tab */}
              <TabsContent value="participants" className="mt-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
                  <div className="flex gap-2">
                    <Select value={participantFilter} onValueChange={(v) => setParticipantFilter(v as "all" | "used" | "available")}>
                      <SelectTrigger className="w-[140px]">
                        <SelectValue placeholder="Filter" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Codes</SelectItem>
                        <SelectItem value="used">Used</SelectItem>
                        <SelectItem value="available">Available</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <CopyAllButton
                    codes={participantCodes.filter((c) => !c.isUsed).map((c) => c.code)}
                    label="Copy Unused"
                  />
                </div>
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {filteredParticipantCodes.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">No codes found.</p>
                  ) : (
                    filteredParticipantCodes.map((code) => (
                      <div
                        key={code.id}
                        className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {code.isUsed ? (
                            <Badge className="bg-green-500/15 text-green-600 border-green-500/30 shrink-0 gap-1">
                              <Lock className="w-3 h-3" />
                              Used
                            </Badge>
                          ) : (
                            <Badge className="bg-blue-500/15 text-blue-600 border-blue-500/30 shrink-0 gap-1">
                              <Unlock className="w-3 h-3" />
                              Available
                            </Badge>
                          )}
                          {code.teamId && (
                            <span className="text-xs text-muted-foreground">
                              Team #{code.teamId}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <code className="text-xs font-mono bg-muted px-2 py-1 rounded">
                            {code.code}
                          </code>
                          <CopyButton text={code.code} size="icon" />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </section>

      {/* ─── Team Access ───────────────────────────────────────────────────── */}
      <section>
        <h3 className="text-sm font-semibold uppercase text-muted-foreground mb-3">Team Access</h3>
        <Card>
          <CardHeader className="pb-3 pt-4 px-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <CardTitle className="text-base">Registration-Based Access</CardTitle>
              <div className="flex gap-2">
                <div className="relative flex-1 sm:w-[250px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search team, name, email..."
                    value={teamSearchQuery}
                    onChange={(e) => setTeamSearchQuery(e.target.value)}
                    className="pl-9 h-9"
                  />
                </div>
                <Select value={teamStatusFilter} onValueChange={(v) => setTeamStatusFilter(v as "all" | "approved" | "pending" | "rejected")}>
                  <SelectTrigger className="w-[130px] h-9">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="space-y-2 max-h-[350px] overflow-y-auto">
              {filteredRegistrations.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No registrations found.</p>
              ) : (
                filteredRegistrations.map((reg) => {
                  const status = getRegStatus(reg);
                  return (
                    <div
                      key={reg.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-muted/30 rounded-lg border gap-2"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <StatusBadge status={status} />
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{reg.teamName}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {reg.fullName} &middot; {reg.email}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {status === "approved" && reg.participantCode && (
                          <div className="flex items-center gap-1">
                            <code className="text-xs font-mono bg-green-500/10 text-green-600 px-2 py-0.5 rounded">
                              {reg.participantCode}
                            </code>
                            <CopyButton text={reg.participantCode} size="icon" />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* ─── Meeting Access ────────────────────────────────────────────────── */}
      <section>
        <h3 className="text-sm font-semibold uppercase text-muted-foreground mb-3">Meeting Access</h3>
        <Card>
          <CardHeader className="pb-3 pt-4 px-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Video className="w-4 h-4" />
                Team Meeting Codes
              </CardTitle>
              <Select value={selectedTeamId} onValueChange={handleTeamSelect}>
                <SelectTrigger className="w-[250px]">
                  <SelectValue placeholder="Select a team..." />
                </SelectTrigger>
                <SelectContent>
                  {(teams ?? []).map((team) => (
                    <SelectItem key={team.id} value={String(team.id)}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {!selectedTeamId ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Select a team to view their meeting codes.
              </p>
            ) : teamCodesLoading ? (
              <div className="space-y-3 py-4">
                <div className="h-12 bg-muted/30 rounded-lg animate-pulse" />
                <div className="h-12 bg-muted/30 rounded-lg animate-pulse" />
              </div>
            ) : teamCodes ? (
              <div className="space-y-4">
                {/* Team Login Code */}
                <div className="p-4 bg-muted/30 rounded-lg border">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium flex items-center gap-2">
                      <Key className="w-4 h-4 text-blue-500" />
                      Team Login Code
                    </h4>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7"
                      onClick={handleRegenerateLogin}
                      disabled={regenerating === "login"}
                    >
                      <RefreshCw className={`w-3.5 h-3.5 mr-1 ${regenerating === "login" ? "animate-spin" : ""}`} />
                      Regenerate
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="text-sm font-mono bg-muted px-3 py-1.5 rounded flex-1">
                      {teamCodes.teamLoginCode?.code ?? "Not generated"}
                    </code>
                    {teamCodes.teamLoginCode && <CopyButton text={teamCodes.teamLoginCode.code} />}
                  </div>
                </div>

                {/* Meet Codes */}
                <div className="p-4 bg-muted/30 rounded-lg border">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium flex items-center gap-2">
                      <Video className="w-4 h-4 text-purple-500" />
                      Meet Codes
                    </h4>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7"
                      onClick={handleRegenerateMeet}
                      disabled={regenerating === "meet"}
                    >
                      <RefreshCw className={`w-3.5 h-3.5 mr-1 ${regenerating === "meet" ? "animate-spin" : ""}`} />
                      Regenerate
                    </Button>
                  </div>
                  {teamCodes.meetCodes.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No meet codes generated yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {teamCodes.meetCodes.map((meetCode) => (
                        <div key={meetCode.id} className="flex items-center gap-2">
                          <code className="text-sm font-mono bg-muted px-3 py-1.5 rounded flex-1">
                            {meetCode.code}
                          </code>
                          <CopyButton text={meetCode.code} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                No codes available for this team.
              </p>
            )}
          </CardContent>
        </Card>
      </section>

      {/* ─── Security Monitoring ───────────────────────────────────────────── */}
      <section>
        <h3 className="text-sm font-semibold uppercase text-muted-foreground mb-3">Security Monitoring</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 mb-1">
                <ShieldCheck className="w-4 h-4 text-green-500" />
                <span className="text-xs text-muted-foreground">Total Codes Generated</span>
              </div>
              <p className="font-bold text-2xl font-mono">
                {adminCodes.length + judgeCodes.length + participantCodes.length}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 mb-1">
                <Activity className="w-4 h-4 text-blue-500" />
                <span className="text-xs text-muted-foreground">Used Codes %</span>
              </div>
              <p className="font-bold text-2xl font-mono">
                {participantCodes.length > 0
                  ? `${Math.round((usedCodesCount / participantCodes.length) * 100)}%`
                  : "0%"}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {usedCodesCount} of {participantCodes.length} participant codes
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 mb-1">
                <Users className="w-4 h-4 text-purple-500" />
                <span className="text-xs text-muted-foreground">Total Registrations</span>
              </div>
              <p className="font-bold text-2xl font-mono">
                {summary?.totalRegistrations ?? 0}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {summary?.pendingRegistrations ?? 0} pending review
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 mb-1">
                <Info className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Auth Model</span>
              </div>
              <p className="font-medium text-sm">Code-Based Authentication</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                No passwords — unique codes per role. Admin/Judge codes are reusable; participant codes are single-use.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}

// ─── Status Badge Component ───────────────────────────────────────────────────

function StatusBadge({ status }: { status: "approved" | "pending" | "rejected" }) {
  const config = {
    approved: { className: "bg-green-500/15 text-green-600 border-green-500/30", label: "Approved" },
    pending: { className: "bg-amber-500/15 text-amber-600 border-amber-500/30", label: "Pending" },
    rejected: { className: "bg-red-500/15 text-red-600 border-red-500/30", label: "Rejected" },
  }[status];

  return <Badge className={`${config.className} shrink-0`}>{config.label}</Badge>;
}
