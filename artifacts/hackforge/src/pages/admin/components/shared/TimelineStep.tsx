import { CheckCircle } from "lucide-react";

export interface TimelineStepData {
  title: string;
  description?: string;
  status: "completed" | "current" | "upcoming";
}

interface TimelineStepProps {
  steps: TimelineStepData[];
}

export default function TimelineStep({ steps }: TimelineStepProps) {
  return (
    <div className="space-y-0">
      {steps.map((step, index) => {
        const isLast = index === steps.length - 1;
        return (
          <div key={index} className="flex gap-3">
            {/* Indicator column */}
            <div className="flex flex-col items-center">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                  step.status === "completed"
                    ? "bg-chart-3/20 text-chart-3"
                    : step.status === "current"
                    ? "bg-primary/20 text-primary ring-2 ring-primary/30"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {step.status === "completed" ? (
                  <CheckCircle className="w-3.5 h-3.5" />
                ) : (
                  <div
                    className={`w-2 h-2 rounded-full ${
                      step.status === "current" ? "bg-primary" : "bg-muted-foreground/50"
                    }`}
                  />
                )}
              </div>
              {!isLast && (
                <div
                  className={`w-0.5 flex-1 min-h-[24px] ${
                    step.status === "completed" ? "bg-chart-3/30" : "bg-border"
                  }`}
                />
              )}
            </div>

            {/* Content */}
            <div className={`pb-4 ${isLast ? "pb-0" : ""}`}>
              <p
                className={`text-sm font-medium ${
                  step.status === "current"
                    ? "text-primary"
                    : step.status === "completed"
                    ? "text-foreground"
                    : "text-muted-foreground"
                }`}
              >
                {step.title}
              </p>
              {step.description && (
                <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
