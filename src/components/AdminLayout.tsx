import { ReactNode, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  LogOut,
  Users,
  Tags,
  BarChart3,
  Menu,
  X,
  Shield,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AdminLayoutProps {
  children: ReactNode;
}

const adminLinks = [
  { to: "/admin", label: "Overview", icon: BarChart3 },
  { to: "/admin/applicants", label: "Screening Pipeline", icon: Users },
  { to: "/admin/keywords", label: "ATS Keywords", icon: Tags },
];

export default function AdminLayout({ children }: AdminLayoutProps) {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-slate-950">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-slate-800 bg-slate-900 transition-transform lg:static lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex h-16 items-center justify-between border-b border-slate-800 px-6">
          <Link to="/admin" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <div>
              <span className="text-lg font-bold text-white">ATS Portal</span>
              <span className="ml-2 rounded bg-violet-600/20 px-2 py-0.5 text-xs font-medium text-violet-400">
                Admin
              </span>
            </div>
          </Link>
          <button onClick={() => setSidebarOpen(false)} className="text-slate-400 lg:hidden">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-6">
          <p className="mb-4 px-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
            Management
          </p>
          {adminLinks.map((link) => {
            const isActive = location.pathname === link.to;
            return (
              <Link
                key={link.to}
                to={link.to}
                className={cn(
                  "group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all",
                  isActive
                    ? "bg-gradient-to-r from-violet-600/20 to-indigo-600/20 text-white shadow-lg shadow-violet-500/10"
                    : "text-slate-400 hover:bg-slate-800/50 hover:text-white"
                )}
              >
                <link.icon
                  className={cn(
                    "h-5 w-5 transition-colors",
                    isActive ? "text-violet-400" : "text-slate-500 group-hover:text-violet-400"
                  )}
                />
                {link.label}
                {isActive && (
                  <span className="ml-auto h-2 w-2 rounded-full bg-violet-500" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* User section */}
        <div className="border-t border-slate-800 p-4">
          <div className="mb-4 flex items-center gap-3 rounded-lg bg-slate-800/50 p-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 text-sm font-bold text-white">
              {user?.email?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-sm font-medium text-white">Administrator</p>
              <p className="truncate text-xs text-slate-400">{user?.email}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-slate-400 hover:bg-slate-800 hover:text-white"
            onClick={signOut}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col">
        <header className="flex h-16 items-center gap-4 border-b border-slate-800 bg-slate-900/50 px-6 backdrop-blur lg:hidden">
          <button onClick={() => setSidebarOpen(true)} className="text-white">
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-violet-500" />
            <span className="font-semibold text-white">ATS Portal</span>
          </div>
        </header>
        <main className="flex-1 overflow-auto bg-slate-950 p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
