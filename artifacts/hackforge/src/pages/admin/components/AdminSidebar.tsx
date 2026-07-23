import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LogOut, Terminal } from "lucide-react";
import type { NavItem } from "../lib/types";

interface AdminSidebarProps {
  items: NavItem[];
  activeSection: string;
  onNavigate: (id: string) => void;
  onLogout: () => void;
}

export default function AdminSidebar({ items, activeSection, onNavigate, onLogout }: AdminSidebarProps) {
  const coreItems = items.filter((i) => i.group === "core");
  const opsItems = items.filter((i) => i.group === "operations");

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="bg-primary/10 p-2 rounded-lg border border-primary/20">
            <Terminal className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h1 className="font-mono font-bold text-sm">ADMIN PANEL</h1>
            <p className="text-xs text-muted-foreground">HackAegis Command Centre</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        <p className="text-[10px] font-mono text-muted-foreground/50 uppercase tracking-wider mb-2 px-3">
          Core
        </p>
        {coreItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer ${
                isActive
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="flex-1 text-left">{item.label}</span>
              {item.badge !== undefined && item.badge > 0 && (
                <Badge className="bg-amber-400/20 text-amber-400 border-amber-400/30 text-[10px] px-1.5 py-0">
                  {item.badge}
                </Badge>
              )}
            </button>
          );
        })}

        <p className="text-[10px] font-mono text-muted-foreground/50 uppercase tracking-wider mt-4 mb-2 px-3">
          Operations
        </p>
        {opsItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer ${
                isActive
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="flex-1 text-left">{item.label}</span>
              {item.badge !== undefined && item.badge > 0 && (
                <Badge className="bg-amber-400/20 text-amber-400 border-amber-400/30 text-[10px] px-1.5 py-0">
                  {item.badge}
                </Badge>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-border">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-muted-foreground"
          onClick={onLogout}
        >
          <LogOut className="w-4 h-4" /> Logout
        </Button>
      </div>
    </div>
  );
}
