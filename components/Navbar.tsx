'use client';

import React from 'react';
import {
  Shield,
  UserCheck,
  Wrench,
  GraduationCap,
  Database,
  RefreshCw,
  Server,
  Layers,
} from 'lucide-react';

export interface UserSession {
  userId: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'MAINTENANCE_STAFF' | 'CAMPUS_USER';
  department: string;
  designation?: string;
}

interface NavbarProps {
  currentUser: UserSession;
  onSwitchUser: (user: UserSession) => void;
  availableUsers: UserSession[];
  dbStatus?: { engine: string; connected: boolean };
  mongoStatus?: { connected: boolean; eventCount: number };
  onRefreshData?: () => void;
  isRefreshing?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  onSwitchUser,
  availableUsers,
  dbStatus,
  mongoStatus,
  onRefreshData,
  isRefreshing,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/95 backdrop-blur shadow-xs">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6">
        {/* Brand Title */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-900 text-teal-400 font-bold shadow-xs">
            <GraduationCap className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900 tracking-tight leading-none sm:text-lg">
              Smart Campus <span className="text-teal-600 font-semibold">DBMS</span>
            </h1>
            <p className="text-xs text-slate-500 font-medium">Resource & Maintenance Management</p>
          </div>
        </div>

        {/* Database Health Pill & Evaluator Role Switcher */}
        <div className="flex items-center gap-3">
          {/* PostgreSQL Status Indicator */}
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
            <Database className="h-3.5 w-3.5 text-teal-600" />
            <span className="font-semibold">PostgreSQL</span>
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500"></span>
          </div>

          {/* MongoDB Status Indicator */}
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
            <Layers className="h-3.5 w-3.5 text-emerald-600" />
            <span className="font-semibold">MongoDB Outbox</span>
            <span className={`inline-block h-2 w-2 rounded-full ${mongoStatus?.connected ? 'bg-emerald-500' : 'bg-amber-400'}`}></span>
          </div>

          {/* Refresh Action */}
          {onRefreshData && (
            <button
              onClick={onRefreshData}
              disabled={isRefreshing}
              aria-label="Refresh campus data"
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
              title="Refresh database records"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin text-teal-600' : ''}`} />
            </button>
          )}

          {/* Role Switcher Menu */}
          <div className="flex items-center gap-2 border-l border-slate-200 pl-3">
            <div className="text-right hidden sm:block">
              <div className="text-xs font-bold text-slate-900 leading-tight">{currentUser.name}</div>
              <div className="text-[11px] font-medium text-slate-500">
                {currentUser.role === 'ADMIN' && <span className="text-purple-700 font-semibold">Administrator</span>}
                {currentUser.role === 'MAINTENANCE_STAFF' && <span className="text-teal-700 font-semibold">Maintenance Staff</span>}
                {currentUser.role === 'CAMPUS_USER' && <span className="text-blue-700 font-semibold">Campus User</span>}
              </div>
            </div>

            {/* Quick Evaluator Role Selector Dropdown */}
            <div className="relative">
              <select
                aria-label="Switch Evaluator Demo Role"
                value={currentUser.userId}
                onChange={e => {
                  const target = availableUsers.find(u => u.userId === e.target.value);
                  if (target) onSwitchUser(target);
                }}
                className="text-xs font-medium bg-slate-50 border border-slate-300 text-slate-800 rounded-md py-1.5 pl-2.5 pr-7 focus:ring-2 focus:ring-teal-500 focus:outline-none cursor-pointer hover:bg-slate-100"
              >
                {availableUsers.map(user => (
                  <option key={user.userId} value={user.userId}>
                    {user.role}: {user.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
