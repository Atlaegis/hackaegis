import { Badge } from "@/components/ui/badge";
import type { ActivityItem } from "../../lib/types";

const typeConfig: Record<ActivityItem["type"], { color: string; dotColor: string }> = {
  registration: { color: "text-chart-1", dotColor: "bg-chart-1" },
  team: { color: "text-chart-2", dotColor: "bg-chart-2" },
  score: { color: "text-chart-3", dotColor: "bg-chart-3" },
  poll: { color: "text-chart-4", dotColor: "bg-chart-4" },
  event: { color: "text-primary", dotColor: "bg-primary" },
  system: { color: "text-muted-foreground", dotColor: "bg-muted-foreground" },
};

interface ActivityFeedProps {
  items: ActivityItem[];
  maxItems?: number;
}

export default function ActivityFeed({ items, maxItems }: ActivityFeedProps) {
  const display = maxItems ? items.slice(0, maxItems) : items;

  if (display.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">No recent activity.</p>
    );
  }

  return (
    <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
      {display.map((item) => {
        const config = typeConfig[item.type] ?? typeConfig.system;
        return (
          <div
            key={item.id}
            className="flex items-start gap-3 py-2 px-3 rounded-lg bg-muted/20 hover:bg-muted/40 text-sm"
          >
            <div className={`w-1.5 h-1.5 rounded-full ${config.dotColor} mt-2 flex-shrink-0`} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium">{item.title}</span>
                {item.badge && (
                  <Badge variant="outline" className="text-[10px]">
                    {item.badge}
                  </Badge>
                )}
              </div>
              {item.description && (
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                  {item.description}
                </p>
              )}
            </div>
            <span className="font-mono text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">
              {formatTimestamp(item.timestamp)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function formatTimestamp(ts: string): string {
  const date = new Date(ts);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return date.toLocaleDateString();
}
