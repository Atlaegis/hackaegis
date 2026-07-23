import { Card, CardContent } from "@/components/ui/card";

interface StatCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  color?: string;
  icon?: React.ComponentType<{ className?: string }>;
}

export default function StatCard({ label, value, subtitle, color = "text-primary", icon: Icon }: StatCardProps) {
  return (
    <Card>
      <CardContent className="pt-4 pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className={`text-3xl font-bold font-mono mt-1 ${color}`}>{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
          </div>
          {Icon && (
            <div className="bg-muted/50 p-2 rounded-lg">
              <Icon className={`w-4 h-4 ${color}`} />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
