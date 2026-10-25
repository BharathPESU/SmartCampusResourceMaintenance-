'use client';

import React from 'react';
import {
  LayoutDashboard,
  CalendarCheck,
  AlertTriangle,
  Building2,
  Package,
  Users2,
  Sparkles,
  Terminal,
  FileText,
  ChevronRight,
} from 'lucide-react';

export type NavigationTab =
  | 'dashboard'
  | 'bookings'
  | 'complaints'
  | 'buildings'
  | 'assets'
  | 'staff'
  | 'semantic_search'
  | 'db_lab'
  | 'docs';

interface SidebarProps {
  activeTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  userRole: 'ADMIN' | 'MAINTENANCE_STAFF' | 'CAMPUS_USER';
  counts?: {
    activeBookings?: number;
    openComplaints?: number;
    totalAssets?: number;
  };
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  userRole,
  counts,
}) => {
  const navItems = [
    {
      id: 'dashboard' as NavigationTab,
      label: 'Main Dashboard',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: 'bookings' as NavigationTab,
      label: 'Room Bookings',
      icon: CalendarCheck,
      badge: counts?.activeBookings ? `${counts.activeBookings}` : null,
    },
    {
      id: 'complaints' as NavigationTab,
      label: 'Complaints & Work',
      icon: AlertTriangle,
      badge: counts?.openComplaints ? `${counts.openComplaints}` : null,
      badgeColor: 'bg-amber-100 text-amber-800',
    },
    {
      id: 'buildings' as NavigationTab,
      label: 'Buildings & Facilities',
      icon: Building2,
      badge: null,
    },
    {
      id: 'assets' as NavigationTab,
      label: 'Asset Inventory',
      icon: Package,
      badge: counts?.totalAssets ? `${counts.totalAssets}` : null,
    },
    {
      id: 'staff' as NavigationTab,
      label: 'Staff Directory',
      icon: Users2,
      badge: null,
    },
    {
      id: 'semantic_search' as NavigationTab,
      label: 'Semantic Search',
      icon: Sparkles,
      badge: 'pgvector',
      badgeColor: 'bg-teal-100 text-teal-800 font-semibold',
    },
    {
      id: 'db_lab' as NavigationTab,
      label: 'DBMS Academic Lab',
      icon: Terminal,
      badge: 'SQL & NoSQL',
      badgeColor: 'bg-purple-100 text-purple-800 font-semibold',
    },
    {
      id: 'docs' as NavigationTab,
      label: 'Documentation & ERD',
      icon: FileText,
      badge: 'Level 3',
      badgeColor: 'bg-slate-200 text-slate-700',
    },
  ];

  return (
    <aside className="w-full md:w-64 border-r border-slate-200 bg-slate-50/60 p-4 shrink-0 flex flex-col justify-between">
      <nav className="space-y-1">
        <div className="px-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
          Navigation Modules
        </div>
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-700 hover:bg-slate-200/70 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon className={`h-4 w-4 ${isActive ? 'text-teal-400' : 'text-slate-500'}`} />
                <span>{item.label}</span>
              </div>
              <div className="flex items-center gap-1.5">
                {item.badge && (
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                      isActive ? 'bg-slate-800 text-teal-300' : item.badgeColor || 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
                {isActive && <ChevronRight className="h-3.5 w-3.5 text-teal-400" />}
              </div>
            </button>
          );
        })}
      </nav>

      {/* Academic Project Footnote */}
      <div className="mt-6 border-t border-slate-200 pt-4 px-2">
        <div className="rounded-lg bg-white p-3 border border-slate-200 shadow-2xs">
          <div className="text-xs font-semibold text-slate-900">DBMS Level 3 Project</div>
          <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">
            PostgreSQL • Drizzle • MongoDB • pgvector • 9 Chen Entities
          </div>
        </div>
      </div>
    </aside>
  );
};
