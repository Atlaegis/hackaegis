import { useState } from "react";
import { Menu, X } from "lucide-react";
import AdminSidebar from "./AdminSidebar";
import type { NavItem } from "../lib/types";

interface AdminLayoutProps {
  items: NavItem[];
  activeSection: string;
  onNavigate: (id: string) => void;
  onLogout: () => void;
  children: React.ReactNode;
}

export default function AdminLayout({ items, activeSection, onNavigate, onLogout, children }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleNavigate = (id: string) => {
    onNavigate(id);
    setSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile hamburger */}
      <button
        className="fixed top-4 left-4 z-50 md:hidden p-2 rounded-lg bg-background border border-border"
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Sidebar */}
      <aside
        className={`fixed md:sticky top-0 left-0 h-screen w-64 bg-card border-r border-border flex flex-col z-40 transition-transform ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <AdminSidebar
          items={items}
          activeSection={activeSection}
          onNavigate={handleNavigate}
          onLogout={onLogout}
        />
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="flex-1 min-h-screen overflow-auto">
        <div className="container mx-auto px-4 md:px-8 py-8 max-w-5xl">
          {children}
        </div>
      </main>
    </div>
  );
}
