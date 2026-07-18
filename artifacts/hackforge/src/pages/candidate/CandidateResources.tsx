import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  BookOpen, FileText, Code, Database, Layout, Palette, HelpCircle,
  ExternalLink, Download, Clock, Mail, MessageSquare, FolderOpen
} from "lucide-react";
import { motion } from "framer-motion";

interface Resource {
  id: number;
  title: string;
  description: string | null;
  category: string;
  url: string;
  fileType?: string;
}

const container = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

const CATEGORY_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  problem_statement: { label: "Problem Statements", icon: FileText, color: "chart-4" },
  rulebook: { label: "Rulebooks", icon: BookOpen, color: "chart-2" },
  api: { label: "APIs & Documentation", icon: Code, color: "chart-1" },
  dataset: { label: "Datasets", icon: Database, color: "chart-3" },
  template: { label: "Templates", icon: Layout, color: "chart-5" },
  brand_asset: { label: "Brand Assets", icon: Palette, color: "chart-4" },
  faq: { label: "FAQs & Guides", icon: HelpCircle, color: "chart-2" },
};

const CATEGORY_ORDER = ["problem_statement", "rulebook", "api", "dataset", "template", "brand_asset", "faq"];

export default function CandidateResources({ token }: { token: string }) {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/cms/resources", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setResources(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20 text-muted-foreground">
        <Clock className="w-5 h-5 animate-spin mr-2" /> Loading resources...
      </div>
    );
  }

  // Group resources by category
  const grouped: Record<string, Resource[]> = {};
  resources.forEach((r) => {
    const cat = r.category || "faq";
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(r);
  });

  const sortedCategories = CATEGORY_ORDER.filter((cat) => grouped[cat]?.length > 0);
  // Add any categories not in our predefined order
  Object.keys(grouped).forEach((cat) => {
    if (!sortedCategories.includes(cat)) sortedCategories.push(cat);
  });

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* Header */}
      <motion.div variants={item}>
        <div>
          <h1 className="text-2xl font-bold font-mono">Resources</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Everything you need for the hackathon - problem statements, templates, APIs, and more.
          </p>
        </div>
      </motion.div>

      {/* Resources by Category */}
      {sortedCategories.length > 0 ? (
        sortedCategories.map((category) => {
          const config = CATEGORY_CONFIG[category] ?? {
            label: category.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
            icon: FolderOpen,
            color: "chart-4",
          };
          const CategoryIcon = config.icon;
          const items = grouped[category];

          return (
            <motion.div key={category} variants={item}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <CategoryIcon className={`w-4 h-4 text-${config.color}`} />
                    {config.label}
                    <Badge variant="secondary" className="ml-auto text-xs">
                      {items.length} {items.length === 1 ? "item" : "items"}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {items.map((resource) => (
                      <ResourceCard key={resource.id} resource={resource} />
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })
      ) : (
        <motion.div variants={item}>
          <Card>
            <CardContent className="py-12 text-center">
              <BookOpen className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <h2 className="font-semibold text-lg">No Resources Available</h2>
              <p className="text-muted-foreground text-sm mt-1">
                Resources will appear here once the organizers publish them.
              </p>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Contact Organizers */}
      <motion.div variants={item}>
        <Card className="border-chart-4/20">
          <CardContent className="py-6">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="bg-chart-4/10 p-3 rounded-full border border-chart-4/20">
                <MessageSquare className="w-6 h-6 text-chart-4" />
              </div>
              <div className="flex-1 text-center sm:text-left">
                <h3 className="font-semibold">Need Help?</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  If you have questions about the hackathon or need additional resources, reach out to the organizers.
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="gap-1.5" asChild>
                  <a href="mailto:support@hackaegis.com">
                    <Mail className="w-3.5 h-3.5" /> Email Support
                  </a>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}

function ResourceCard({ resource }: { resource: Resource }) {
  return (
    <div className="p-3 rounded-lg border border-border bg-muted/20 hover:bg-muted/40 transition-colors group">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{resource.title}</p>
          {resource.description && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{resource.description}</p>
          )}
          {resource.fileType && (
            <Badge variant="secondary" className="mt-2 text-[10px]">
              {resource.fileType.toUpperCase()}
            </Badge>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="flex-shrink-0 text-muted-foreground group-hover:text-chart-4 transition-colors"
          asChild
        >
          <a href={resource.url} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="w-4 h-4" />
          </a>
        </Button>
      </div>
    </div>
  );
}
