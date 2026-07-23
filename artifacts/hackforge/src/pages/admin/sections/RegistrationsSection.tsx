import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  X,
  Download,
  CheckCircle2,
  XCircle,
  Clock,
  Users,
  Mail,
  Phone,
  Copy,
  Check,
  CreditCard,
  Calendar,
  Hash,
  Layers,
  ChevronDown,
  ChevronUp,
  ListChecks,
} from "lucide-react";
import { useAdminFetch, adminApi } from "../lib/api";
import type { Registration } from "../lib/types";
import ConfirmDialog from "../components/shared/ConfirmDialog";

type StatusFilter = "all" | "pending" | "approved" | "rejected";

function getStatus(reg: Registration): "pending" | "approved" | "rejected" {
  if (reg.participantCode) return "approved";
  if (reg.paymentStatus === "rejected") return "rejected";
  return "pending";
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function generateCSV(registrations: Registration[]): string {
  const headers = ["ID", "Team Name", "Leader", "Email", "Phone", "Members", "Status", "Payment Mode", "Date"];
  const rows = registrations.map((r) => [
    r.id,
    `"${r.teamName.replace(/"/g, '""')}"`,
    `"${r.fullName.replace(/"/g, '""')}"`,
    r.email,
    r.phone ?? "",
    r.memberCount,
    getStatus(r),
    r.paymentMode,
    new Date(r.createdAt).toISOString().split("T")[0],
  ]);
  return [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
}

function downloadCSV(csv: string, filename: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export default function RegistrationsSection() {
  const { data: registrations, loading, refetch } = useAdminFetch<Registration[]>("/api/admin/registrations");

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [teamSizeFilter, setTeamSizeFilter] = useState<string>("all");
  const [paymentFilter, setPaymentFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [activeTab, setActiveTab] = useState<StatusFilter>("pending");

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // Dialogs
  const [rejectTarget, setRejectTarget] = useState<Registration | null>(null);
  const [bulkRejectOpen, setBulkRejectOpen] = useState(false);

  // Expanded cards
  const [expandedCards, setExpandedCards] = useState<Set<number>>(new Set());

  // Copy feedback
  const [copiedId, setCopiedId] = useState<number | null>(null);

  // Processing state
  const [processingIds, setProcessingIds] = useState<Set<number>>(new Set());

  const allRegs = registrations ?? [];

  // Status counts
  const counts = useMemo(() => {
    const c = { all: allRegs.length, pending: 0, approved: 0, rejected: 0 };
    allRegs.forEach((r) => {
      const s = getStatus(r);
      c[s]++;
    });
    return c;
  }, [allRegs]);

  // Filtered registrations
  const filtered = useMemo(() => {
    let result = allRegs;

    // Status tab filter
    if (activeTab !== "all") {
      result = result.filter((r) => getStatus(r) === activeTab);
    }

    // Text search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (r) =>
          r.teamName.toLowerCase().includes(q) ||
          r.fullName.toLowerCase().includes(q) ||
          r.email.toLowerCase().includes(q)
      );
    }

    // Team size filter
    if (teamSizeFilter !== "all") {
      const size = parseInt(teamSizeFilter);
      result = result.filter((r) => r.memberCount === size);
    }

    // Payment status filter
    if (paymentFilter !== "all") {
      result = result.filter((r) => r.paymentStatus === paymentFilter);
    }

    // Date range filter
    if (dateFrom) {
      const from = new Date(dateFrom);
      result = result.filter((r) => new Date(r.createdAt) >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      result = result.filter((r) => new Date(r.createdAt) <= to);
    }

    return result;
  }, [allRegs, activeTab, searchQuery, teamSizeFilter, paymentFilter, dateFrom, dateTo]);

  const pendingFiltered = useMemo(() => filtered.filter((r) => getStatus(r) === "pending"), [filtered]);

  const hasFilters = searchQuery || teamSizeFilter !== "all" || paymentFilter !== "all" || dateFrom || dateTo;

  const clearFilters = () => {
    setSearchQuery("");
    setTeamSizeFilter("all");
    setPaymentFilter("all");
    setDateFrom("");
    setDateTo("");
  };

  // Selection handlers
  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllPending = () => {
    setSelectedIds(new Set(pendingFiltered.map((r) => r.id)));
  };

  const clearSelection = () => setSelectedIds(new Set());

  // Actions
  const handleApprove = useCallback(
    async (id: number) => {
      setProcessingIds((prev) => new Set(prev).add(id));
      try {
        await adminApi("POST", `/api/admin/registrations/${id}/approve`);
        refetch();
      } catch (e) {
        console.error("Approve failed:", e);
      } finally {
        setProcessingIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    },
    [refetch]
  );

  const handleReject = useCallback(
    async (id: number, reason: string) => {
      setProcessingIds((prev) => new Set(prev).add(id));
      try {
        await adminApi("POST", `/api/admin/registrations/${id}/reject`, { reason });
        refetch();
      } catch (e) {
        console.error("Reject failed:", e);
      } finally {
        setProcessingIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    },
    [refetch]
  );

  const handleBulkApprove = async () => {
    const ids = Array.from(selectedIds);
    for (const id of ids) {
      await handleApprove(id);
    }
    clearSelection();
  };

  const handleBulkReject = async (reason: string) => {
    const ids = Array.from(selectedIds);
    for (const id of ids) {
      await handleReject(id, reason);
    }
    clearSelection();
    setBulkRejectOpen(false);
  };

  const handleCopyCode = (id: number, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleExpanded = (id: number) => {
    setExpandedCards((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleExportCSV = () => {
    const csv = generateCSV(filtered);
    const filename = `registrations_${activeTab}_${new Date().toISOString().split("T")[0]}.csv`;
    downloadCSV(csv, filename);
  };

  if (loading && !registrations) {
    return (
      <div className="space-y-4">
        <div className="h-10 bg-muted/30 rounded-lg animate-pulse" />
        <div className="h-12 bg-muted/30 rounded-lg animate-pulse" />
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 bg-muted/30 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Registration Queue</h2>
          <p className="text-sm text-muted-foreground">{counts.all} total registrations</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={filtered.length === 0}>
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Tabs with counters */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as StatusFilter)}>
        <TabsList className="w-full sm:w-auto grid grid-cols-4 sm:inline-flex">
          <TabsTrigger value="pending" className="gap-1.5 text-xs sm:text-sm">
            <Clock className="w-3 h-3" />
            Pending
            <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px] bg-amber-500/15 text-amber-600 border-amber-500/30">
              {counts.pending}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="approved" className="gap-1.5 text-xs sm:text-sm">
            <CheckCircle2 className="w-3 h-3" />
            Approved
            <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px] bg-green-500/15 text-green-600 border-green-500/30">
              {counts.approved}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="rejected" className="gap-1.5 text-xs sm:text-sm">
            <XCircle className="w-3 h-3" />
            Rejected
            <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px] bg-red-500/15 text-red-600 border-red-500/30">
              {counts.rejected}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="all" className="gap-1.5 text-xs sm:text-sm">
            <Layers className="w-3 h-3" />
            All
            <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
              {counts.all}
            </Badge>
          </TabsTrigger>
        </TabsList>

        {/* Search & Filters */}
        <div className="mt-4 space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search team, name, or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Select value={teamSizeFilter} onValueChange={setTeamSizeFilter}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Team Size" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sizes</SelectItem>
                  <SelectItem value="1">1 member</SelectItem>
                  <SelectItem value="2">2 members</SelectItem>
                  <SelectItem value="3">3 members</SelectItem>
                  <SelectItem value="4">4 members</SelectItem>
                  <SelectItem value="5">5+ members</SelectItem>
                </SelectContent>
              </Select>
              <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Payment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Payments</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="free">Free</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-[140px]"
                placeholder="From"
              />
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-[140px]"
                placeholder="To"
              />
              {hasFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9">
                  <X className="w-4 h-4 mr-1" />
                  Clear
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Bulk Operations Bar */}
        <AnimatePresence>
          {selectedIds.size > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-3 flex flex-wrap items-center gap-2 p-3 bg-primary/5 border border-primary/20 rounded-lg">
                <ListChecks className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">{selectedIds.size} selected</span>
                <div className="flex-1" />
                <Button variant="outline" size="sm" onClick={selectAllPending}>
                  Select All Pending
                </Button>
                <Button
                  size="sm"
                  className="bg-green-600 hover:bg-green-700 text-white"
                  onClick={handleBulkApprove}
                >
                  Bulk Approve
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => setBulkRejectOpen(true)}
                >
                  Bulk Reject
                </Button>
                <Button variant="ghost" size="sm" onClick={clearSelection}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Select All Pending (shown when no selection yet and on pending tab) */}
        {activeTab === "pending" && selectedIds.size === 0 && pendingFiltered.length > 0 && (
          <div className="mt-3">
            <Button variant="outline" size="sm" onClick={selectAllPending}>
              <ListChecks className="w-4 h-4 mr-2" />
              Select All Pending ({pendingFiltered.length})
            </Button>
          </div>
        )}

        {/* Registration Cards */}
        <TabsContent value={activeTab} className="mt-4">
          {filtered.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <p className="text-sm">No registrations found{hasFilters ? " matching your filters" : ""}.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3">
              <AnimatePresence mode="popLayout">
                {filtered.map((reg) => (
                  <RegistrationCard
                    key={reg.id}
                    registration={reg}
                    isSelected={selectedIds.has(reg.id)}
                    isExpanded={expandedCards.has(reg.id)}
                    isProcessing={processingIds.has(reg.id)}
                    copiedId={copiedId}
                    onToggleSelect={() => toggleSelect(reg.id)}
                    onToggleExpand={() => toggleExpanded(reg.id)}
                    onApprove={() => handleApprove(reg.id)}
                    onReject={() => setRejectTarget(reg)}
                    onCopyCode={(code) => handleCopyCode(reg.id, code)}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Reject Dialog (single) */}
      <ConfirmDialog
        open={!!rejectTarget}
        onOpenChange={(open) => { if (!open) setRejectTarget(null); }}
        title="Reject Registration"
        description={rejectTarget ? `Reject registration from "${rejectTarget.teamName}" (${rejectTarget.fullName})?` : ""}
        confirmLabel="Reject"
        variant="destructive"
        withReason
        reasonLabel="Rejection Reason (required)"
        reasonPlaceholder="Enter the reason for rejection..."
        onConfirm={(reason) => {
          if (rejectTarget && reason) {
            handleReject(rejectTarget.id, reason);
            setRejectTarget(null);
          }
        }}
      />

      {/* Bulk Reject Dialog */}
      <ConfirmDialog
        open={bulkRejectOpen}
        onOpenChange={setBulkRejectOpen}
        title="Bulk Reject Registrations"
        description={`Reject ${selectedIds.size} selected registration(s)?`}
        confirmLabel="Reject All"
        variant="destructive"
        withReason
        reasonLabel="Rejection Reason (required, applies to all)"
        reasonPlaceholder="Enter the shared reason for rejection..."
        onConfirm={(reason) => {
          if (reason) handleBulkReject(reason);
        }}
      />
    </div>
  );
}

// ─── Registration Card Component ──────────────────────────────────────────────

interface RegistrationCardProps {
  registration: Registration;
  isSelected: boolean;
  isExpanded: boolean;
  isProcessing: boolean;
  copiedId: number | null;
  onToggleSelect: () => void;
  onToggleExpand: () => void;
  onApprove: () => void;
  onReject: () => void;
  onCopyCode: (code: string) => void;
}

function RegistrationCard({
  registration: reg,
  isSelected,
  isExpanded,
  isProcessing,
  copiedId,
  onToggleSelect,
  onToggleExpand,
  onApprove,
  onReject,
  onCopyCode,
}: RegistrationCardProps) {
  const status = getStatus(reg);

  const statusBadge = {
    pending: <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30 hover:bg-amber-500/20">Pending</Badge>,
    approved: <Badge className="bg-green-500/15 text-green-600 border-green-500/30 hover:bg-green-500/20">Approved</Badge>,
    rejected: <Badge className="bg-red-500/15 text-red-600 border-red-500/30 hover:bg-red-500/20">Rejected</Badge>,
  }[status];

  const paymentBadge = (
    <Badge variant="outline" className="text-xs gap-1">
      <CreditCard className="w-3 h-3" />
      {reg.paymentMode}
    </Badge>
  );

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
    >
      <Card className={`transition-colors ${isSelected ? "border-primary/50 bg-primary/5" : ""} ${isProcessing ? "opacity-60 pointer-events-none" : ""}`}>
        <CardHeader className="pb-2 pt-4 px-4">
          <div className="flex items-start gap-3">
            {/* Selection checkbox (only for pending) */}
            {status === "pending" && (
              <div className="pt-0.5">
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={onToggleSelect}
                  aria-label={`Select ${reg.teamName}`}
                />
              </div>
            )}

            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-mono text-muted-foreground">#{reg.id}</span>
                <CardTitle className="text-base truncate">{reg.teamName}</CardTitle>
                {statusBadge}
                {paymentBadge}
                <Badge variant="outline" className="text-xs gap-1">
                  <Users className="w-3 h-3" />
                  {reg.memberCount}
                </Badge>
              </div>
            </div>

            {/* Expand toggle */}
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onToggleExpand}>
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </div>
        </CardHeader>

        <CardContent className="px-4 pb-4 pt-0">
          {/* Always visible: Leader info */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground mt-2">
            <span className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              {reg.fullName}
            </span>
            <span className="flex items-center gap-1">
              <Mail className="w-3.5 h-3.5" />
              {reg.email}
            </span>
            {reg.phone && (
              <span className="flex items-center gap-1">
                <Phone className="w-3.5 h-3.5" />
                {reg.phone}
              </span>
            )}
          </div>

          {/* Expanded content */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="mt-4 space-y-4">
                  {/* Team Members */}
                  {reg.teamMembers && reg.teamMembers.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">Team Members</h4>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {reg.teamMembers.map((member, idx) => (
                          <div key={idx} className="p-2 bg-muted/30 rounded-md text-xs space-y-0.5">
                            <p className="font-medium">{member.fullName}</p>
                            <p className="text-muted-foreground">{member.email}</p>
                            {member.phone && <p className="text-muted-foreground">{member.phone}</p>}
                            {member.college && (
                              <p className="text-muted-foreground">
                                {member.college}{member.branch ? ` - ${member.branch}` : ""}{member.year ? ` (${member.year})` : ""}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Project Info */}
                  {reg.projectInfo && (
                    <div>
                      <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">Project Info</h4>
                      <div className="p-3 bg-muted/30 rounded-md text-sm space-y-1">
                        {reg.projectInfo.domain && (
                          <p><span className="text-muted-foreground">Domain:</span> {reg.projectInfo.domain}</p>
                        )}
                        {reg.projectInfo.title && (
                          <p><span className="text-muted-foreground">Title:</span> {reg.projectInfo.title}</p>
                        )}
                        {reg.projectInfo.problemStatement && (
                          <p><span className="text-muted-foreground">Problem:</span> {reg.projectInfo.problemStatement}</p>
                        )}
                        {reg.projectInfo.description && (
                          <p className="text-muted-foreground text-xs mt-1">{reg.projectInfo.description}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Notes */}
                  {reg.notes && (
                    <div>
                      <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-1">Notes</h4>
                      <p className="text-sm text-muted-foreground">{reg.notes}</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Footer: date + actions */}
          <div className="flex flex-wrap items-center justify-between gap-2 mt-4 pt-3 border-t border-border">
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {formatDate(reg.createdAt)}
              </span>
              {status === "approved" && reg.participantCode && (
                <span className="flex items-center gap-1 font-mono bg-green-500/10 text-green-600 px-2 py-0.5 rounded">
                  <Hash className="w-3 h-3" />
                  {reg.participantCode}
                  <button
                    onClick={() => onCopyCode(reg.participantCode!)}
                    className="ml-1 hover:text-green-800 transition-colors"
                    title="Copy code"
                  >
                    {copiedId === reg.id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  </button>
                </span>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex gap-2">
              {status === "pending" && (
                <>
                  <Button
                    size="sm"
                    className="h-7 bg-green-600 hover:bg-green-700 text-white text-xs"
                    onClick={onApprove}
                    disabled={isProcessing}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="h-7 text-xs"
                    onClick={onReject}
                    disabled={isProcessing}
                  >
                    <XCircle className="w-3.5 h-3.5 mr-1" />
                    Reject
                  </Button>
                </>
              )}
              {status === "rejected" && reg.notes && (
                <span className="text-xs text-red-500 italic">Reason: {reg.notes}</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
