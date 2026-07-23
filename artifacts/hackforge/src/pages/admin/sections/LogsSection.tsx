import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ScrollText,
  Search,
  Download,
  Filter,
  X,
  ChevronDown,
  ChevronUp,
  Database,
  Server,
  HardDrive,
  CalendarDays,
  Activity,
  Layers,
  Clock,
} from "lucide-react";
import { useAdminFetch } from "../lib/api";
import type { AdminLog } from "../lib/types";
import StatCard from "../components/shared/StatCard";

// --- Module & Action Type Derivation ---

type Module = "Teams" | "Registrations" | "Judges" | "Scores" | "Polls" | "Events" | "Config" | "Codes" | "Other";
type ActionType = "Create" | "Update" | "Delete" | "Approve" | "Reject" | "Toggle" | "Activate" | "Deactivate" | "Assign" | "Score" | "Other";

function deriveModule(action: string): Module {
  const a = action.toLowerCase();
  if (a.includes("team") || a.includes("disqualif")) return "Teams";
  if (a.includes("registr") || a.includes("approve") || a.includes("reject")) return "Registrations";
  if (a.includes("judge")) return "Judges";
  if (a.includes("score")) return "Scores";
  if (a.includes("poll") || a.includes("vote")) return "Polls";
  if (a.includes("event") || a.includes("hackathon") || a.includes("phase") || a.includes("status")) return "Events";
  if (a.includes("config") || a.includes("setting")) return "Config";
  if (a.includes("code")) return "Codes";
  return "Other";
}

function deriveActionType(action: string): ActionType {
  const a = action.toLowerCase();
  if (a.includes("create")) return "Create";
  if (a.includes("update") || a.includes("edit")) return "Update";
  if (a.includes("delete") || a.includes("disqualif")) return "Delete";
  if (a.includes("approve")) return "Approve";
  if (a.includes("reject")) return "Reject";
  if (a.includes("toggle")) return "Toggle";
  if (a.includes("activate") && !a.includes("deactivate")) return "Activate";
  if (a.includes("deactivate")) return "Deactivate";
  if (a.includes("assign") || a.includes("unassign")) return "Assign";
  if (a.includes("score")) return "Score";
  return "Other";
}

function getActionColor(actionType: ActionType): string {
  switch (actionType) {
    case "Create":
    case "Approve":
    case "Activate":
      return "text-green-500";
    case "Delete":
    case "Reject":
    case "Deactivate":
      return "text-red-500";
    case "Update":
    case "Toggle":
      return "text-blue-500";
    case "Score":
    case "Assign":
      return "text-purple-500";
    default:
      return "text-muted-foreground";
  }
}

function getActionDotColor(actionType: ActionType): string {
  switch (actionType) {
    case "Create":
    case "Approve":
    case "Activate":
      return "bg-green-500";
    case "Delete":
    case "Reject":
    case "Deactivate":
      return "bg-red-500";
    case "Update":
    case "Toggle":
      return "bg-blue-500";
    case "Score":
    case "Assign":
      return "bg-purple-500";
    default:
      return "bg-muted-foreground";
  }
}

function getActionBadgeClasses(actionType: ActionType): string {
  switch (actionType) {
    case "Create":
    case "Approve":
    case "Activate":
      return "bg-green-500/10 text-green-600 border-green-500/20";
    case "Delete":
    case "Reject":
    case "Deactivate":
      return "bg-red-500/10 text-red-600 border-red-500/20";
    case "Update":
    case "Toggle":
      return "bg-blue-500/10 text-blue-600 border-blue-500/20";
    case "Score":
    case "Assign":
      return "bg-purple-500/10 text-purple-600 border-purple-500/20";
    default:
      return "bg-muted text-muted-foreground border-muted";
  }
}

function formatTimestamp(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    + " at "
    + d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
}

function formatTimestampFull(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZoneName: "short",
  });
}

function isToday(dateStr: string): boolean {
  const d = new Date(dateStr);
  const now = new Date();
  return d.getFullYear() === now.getFullYear()
    && d.getMonth() === now.getMonth()
    && d.getDate() === now.getDate();
}

function getMostActiveModule(logs: AdminLog[]): string {
  const counts: Record<string, number> = {};
  for (const log of logs) {
    const mod = deriveModule(log.action);
    counts[mod] = (counts[mod] ?? 0) + 1;
  }
  let maxModule = "N/A";
  let maxCount = 0;
  for (const [mod, count] of Object.entries(counts)) {
    if (count > maxCount) {
      maxCount = count;
      maxModule = mod;
    }
  }
  return maxModule;
}

function generateCSV(logs: AdminLog[]): string {
  const header = "ID,Timestamp,Action,Details,Module";
  const rows = logs.map((log) => {
    const module = deriveModule(log.action);
    const details = (log.details ?? "").replace(/"/g, '""');
    const action = log.action.replace(/"/g, '""');
    return `${log.id},"${log.createdAt}","${action}","${details}","${module}"`;
  });
  return [header, ...rows].join("\n");
}

function downloadCSV(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

const MODULES: Module[] = ["Teams", "Registrations", "Judges", "Scores", "Polls", "Events", "Config", "Codes"];
const ACTION_TYPES: ActionType[] = ["Create", "Update", "Delete", "Approve", "Reject", "Toggle", "Activate", "Deactivate"];
const PAGE_SIZE = 50;

export default function LogsSection() {
  const { data: logs, loading } = useAdminFetch<AdminLog[]>("/api/admin/logs");

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [moduleFilter, setModuleFilter] = useState<string>("All");
  const [actionTypeFilter, setActionTypeFilter] = useState<string>("All");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Pagination
  const [page, setPage] = useState(1);

  // Expanded entry
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const allLogs = logs ?? [];

  // Filtered logs
  const filteredLogs = useMemo(() => {
    let result = allLogs;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (log) =>
          log.action.toLowerCase().includes(q) ||
          (log.details ?? "").toLowerCase().includes(q)
      );
    }

    if (moduleFilter !== "All") {
      result = result.filter((log) => deriveModule(log.action) === moduleFilter);
    }

    if (actionTypeFilter !== "All") {
      result = result.filter((log) => deriveActionType(log.action) === actionTypeFilter);
    }

    if (dateFrom) {
      const from = new Date(dateFrom);
      from.setHours(0, 0, 0, 0);
      result = result.filter((log) => new Date(log.createdAt) >= from);
    }

    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      result = result.filter((log) => new Date(log.createdAt) <= to);
    }

    return result;
  }, [allLogs, searchQuery, moduleFilter, actionTypeFilter, dateFrom, dateTo]);

  // Paginated logs
  const paginatedLogs = useMemo(() => {
    return filteredLogs.slice(0, page * PAGE_SIZE);
  }, [filteredLogs, page]);

  const hasMore = paginatedLogs.length < filteredLogs.length;

  // Stats
  const totalEntries = allLogs.length;
  const todayActions = allLogs.filter((log) => isToday(log.createdAt)).length;
  const mostActiveModule = getMostActiveModule(allLogs);
  const lastActivity = allLogs.length > 0 ? formatTimestamp(allLogs[0].createdAt) : "N/A";

  // Active filter count
  const activeFilterCount = [
    searchQuery.trim() ? 1 : 0,
    moduleFilter !== "All" ? 1 : 0,
    actionTypeFilter !== "All" ? 1 : 0,
    dateFrom ? 1 : 0,
    dateTo ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  const clearFilters = useCallback(() => {
    setSearchQuery("");
    setModuleFilter("All");
    setActionTypeFilter("All");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  }, []);

  const handleExportFiltered = () => {
    const csv = generateCSV(filteredLogs);
    downloadCSV(csv, `audit-logs-filtered-${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const handleExportAll = () => {
    const csv = generateCSV(allLogs);
    downloadCSV(csv, `audit-logs-all-${new Date().toISOString().slice(0, 10)}.csv`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ScrollText className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-xl font-bold">Activity Logs</h1>
            <p className="text-sm text-muted-foreground">Complete audit trail of all admin actions</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExportFiltered}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportAll}>
            <Download className="w-4 h-4 mr-2" />
            Export All
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <motion.div
        className="grid grid-cols-2 md:grid-cols-4 gap-3"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <StatCard label="Total Log Entries" value={totalEntries} icon={ScrollText} color="text-chart-1" />
        <StatCard label="Today's Actions" value={todayActions} icon={CalendarDays} color="text-chart-2" />
        <StatCard label="Most Active Module" value={mostActiveModule} icon={Layers} color="text-chart-3" />
        <StatCard label="Last Activity" value={lastActivity} icon={Clock} color="text-chart-4" />
      </motion.div>

      {/* Search & Filters */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">Search & Filters</span>
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {activeFilterCount} active
              </Badge>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Search */}
            <div className="relative lg:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search actions & details..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                className="pl-9"
              />
            </div>

            {/* Module Filter */}
            <Select value={moduleFilter} onValueChange={(v) => { setModuleFilter(v); setPage(1); }}>
              <SelectTrigger>
                <SelectValue placeholder="Module" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Modules</SelectItem>
                {MODULES.map((m) => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Action Type Filter */}
            <Select value={actionTypeFilter} onValueChange={(v) => { setActionTypeFilter(v); setPage(1); }}>
              <SelectTrigger>
                <SelectValue placeholder="Action Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Actions</SelectItem>
                {ACTION_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Date From */}
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">From</label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
              />
            </div>

            {/* Date To */}
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">To</label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
              />
            </div>

            {/* Clear Filters */}
            <div className="flex items-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                disabled={activeFilterCount === 0}
                className="w-full"
              >
                <X className="w-4 h-4 mr-1" />
                Clear Filters
              </Button>
            </div>
          </div>

          {/* Results count */}
          <div className="mt-3 text-xs text-muted-foreground">
            Showing {paginatedLogs.length} of {filteredLogs.length} entries
            {filteredLogs.length !== allLogs.length && (
              <span> (filtered from {allLogs.length} total)</span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Log Entries Timeline */}
      <Card>
        <CardContent className="pt-4 pb-4">
          {paginatedLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <ScrollText className="w-10 h-10 mb-3 opacity-50" />
              <p className="text-sm">No log entries found</p>
              {activeFilterCount > 0 && (
                <Button variant="ghost" size="sm" className="mt-2" onClick={clearFilters}>
                  Clear filters
                </Button>
              )}
            </div>
          ) : (
            <div className="relative">
              {/* Timeline left border */}
              <div className="absolute left-[11px] top-4 bottom-4 w-px bg-border" />

              <div className="space-y-0">
                {paginatedLogs.map((log) => {
                  const actionType = deriveActionType(log.action);
                  const module = deriveModule(log.action);
                  const isExpanded = expandedId === log.id;

                  return (
                    <div key={log.id} className="relative pl-8">
                      {/* Dot */}
                      <div
                        className={`absolute left-[7px] top-[18px] w-[9px] h-[9px] rounded-full ring-2 ring-background ${getActionDotColor(actionType)}`}
                      />

                      {/* Entry */}
                      <motion.div
                        className="py-3 border-b border-border/50 last:border-b-0 cursor-pointer hover:bg-muted/30 rounded-md px-3 -mx-3 transition-colors"
                        onClick={() => setExpandedId(isExpanded ? null : log.id)}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`font-semibold text-sm ${getActionColor(actionType)}`}>
                                {log.action}
                              </span>
                              <Badge
                                variant="outline"
                                className={`text-[10px] px-1.5 py-0 ${getActionBadgeClasses(actionType)}`}
                              >
                                {module}
                              </Badge>
                            </div>
                            {log.details && (
                              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                                {log.details}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[11px] text-muted-foreground font-mono whitespace-nowrap">
                              {formatTimestamp(log.createdAt)}
                            </span>
                            {isExpanded ? (
                              <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                            )}
                          </div>
                        </div>

                        {/* Expanded Detail */}
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <div className="mt-3 pt-3 border-t border-border/50 space-y-2">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  <div>
                                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Action</span>
                                    <p className="text-sm font-medium font-mono">{log.action}</p>
                                  </div>
                                  <div>
                                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Module</span>
                                    <p className="text-sm">
                                      <Badge variant="outline" className={`text-xs ${getActionBadgeClasses(actionType)}`}>
                                        {module}
                                      </Badge>
                                    </p>
                                  </div>
                                  <div className="sm:col-span-2">
                                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Details</span>
                                    <p className="text-sm text-muted-foreground">
                                      {log.details || "No additional details"}
                                    </p>
                                  </div>
                                  <div className="sm:col-span-2">
                                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Timestamp</span>
                                    <p className="text-sm font-mono">{formatTimestampFull(log.createdAt)}</p>
                                  </div>
                                  <div>
                                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Entry ID</span>
                                    <p className="text-sm font-mono text-muted-foreground">#{log.id}</p>
                                  </div>
                                  <div>
                                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Action Type</span>
                                    <p className="text-sm">
                                      <Badge variant="outline" className={`text-xs ${getActionBadgeClasses(actionType)}`}>
                                        {actionType}
                                      </Badge>
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    </div>
                  );
                })}
              </div>

              {/* Load More */}
              {hasMore && (
                <div className="flex justify-center pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Load More ({filteredLogs.length - paginatedLogs.length} remaining)
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* System Status */}
      <section>
        <h2 className="text-lg font-semibold mb-4">System Status</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-3">
                <div className="bg-green-500/10 p-2 rounded-lg">
                  <Database className="w-4 h-4 text-green-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Database</p>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <span className="text-sm font-medium text-green-600">Connected</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-3">
                <div className="bg-green-500/10 p-2 rounded-lg">
                  <Server className="w-4 h-4 text-green-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">API Server</p>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <span className="text-sm font-medium text-green-600">Running</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-3">
                <div className="bg-muted p-2 rounded-lg">
                  <HardDrive className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Last Backup</p>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-muted-foreground" />
                    <span className="text-sm font-medium text-muted-foreground">N/A</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
