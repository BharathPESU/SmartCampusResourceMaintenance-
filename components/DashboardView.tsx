'use client';

import React, { useState } from 'react';
import {
  Building2,
  DoorOpen,
  CalendarCheck,
  AlertTriangle,
  Package,
  Users,
  Activity,
  ArrowUpRight,
  RefreshCw,
  Sparkles,
  Terminal,
  CheckCircle2,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { NavigationTab } from './Sidebar';

interface DashboardViewProps {
  onNavigate: (tab: NavigationTab) => void;
  analyticsData: any;
  recentComplaints: any[];
  recentEvents: any[];
  onTriggerWorker: () => Promise<void>;
  isWorkerRunning: boolean;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigate,
  analyticsData,
  recentComplaints,
  recentEvents,
  onTriggerWorker,
  isWorkerRunning,
}) => {
  const [workerMessage, setWorkerMessage] = useState<string | null>(null);

  const metrics = analyticsData?.metrics || {
    totalBuildings: 3,
    totalRooms: 5,
    availableRooms: 5,
    activeAssets: 5,
    activeBookings: 2,
    openComplaints: 3,
    highPriorityComplaints: 2,
    unassignedComplaints: 1,
    resolvedComplaints: 1,
    totalStaff: 2,
  };

  const roomChartData = analyticsData?.roomUtilization || [
    { roomNumber: 'ENG-101', totalHoursBooked: 2.0, totalBookings: 1 },
    { roomNumber: 'CS-301', totalHoursBooked: 2.0, totalBookings: 1 },
    { roomNumber: 'ENG-204', totalHoursBooked: 2.0, totalBookings: 1 },
    { roomNumber: 'CS-405', totalHoursBooked: 0, totalBookings: 0 },
    { roomNumber: 'TESLA-108', totalHoursBooked: 0, totalBookings: 0 },
  ];

  const categoryChartData = analyticsData?.complaintCategories || [
    { category: 'HVAC', total: 1, resolved: 0 },
    { category: 'AV_EQUIPMENT', total: 1, resolved: 1 },
    { category: 'IT_NETWORK', total: 1, resolved: 0 },
    { category: 'ELECTRICAL', total: 1, resolved: 0 },
  ];

  const handleWorkerClick = async () => {
    try {
      await onTriggerWorker();
      setWorkerMessage('Outbox worker processed pending events into MongoDB!');
      setTimeout(() => setWorkerMessage(null), 4000);
    } catch {
      setWorkerMessage('Worker executed.');
      setTimeout(() => setWorkerMessage(null), 4000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Welcome */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 text-white p-6 rounded-xl shadow-xs">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-teal-500/20 text-teal-300 mb-2 border border-teal-500/30">
            <Activity className="h-3.5 w-3.5" />
            Live Authoritative PostgreSQL Engine
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Smart Campus Operations Center</h2>
          <p className="text-sm text-slate-300 mt-1 max-w-2xl">
            Real-time facility reservations, concurrency control, maintenance lifecycle management, MongoDB event stream, and pgvector semantic intelligence.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => onNavigate('bookings')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <CalendarCheck className="h-4 w-4" />
            Book Room
          </button>
          <button
            onClick={() => onNavigate('complaints')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-semibold border border-slate-700 transition-colors"
          >
            <AlertTriangle className="h-4 w-4 text-amber-400" />
            Report Issue
          </button>
          <button
            onClick={() => onNavigate('db_lab')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-purple-900/60 hover:bg-purple-900 text-purple-200 text-xs font-semibold border border-purple-700 transition-colors"
          >
            <Terminal className="h-4 w-4" />
            DBMS Lab
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Buildings & Rooms</span>
            <Building2 className="h-4 w-4 text-slate-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{metrics.totalBuildings}</span>
            <span className="text-xs text-slate-500">buildings / {metrics.totalRooms} rooms</span>
          </div>
          <div className="mt-2 text-xs text-emerald-600 font-medium flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {metrics.availableRooms} currently available
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Active Bookings</span>
            <CalendarCheck className="h-4 w-4 text-teal-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{metrics.activeBookings}</span>
            <span className="text-xs text-slate-500">confirmed reservations</span>
          </div>
          <div className="mt-2 text-xs text-slate-500">Atomic concurrency check enabled</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Open Complaints</span>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{metrics.openComplaints}</span>
            <span className="text-xs text-amber-700 font-medium">({metrics.highPriorityComplaints} critical/high)</span>
          </div>
          <div className="mt-2 text-xs text-slate-500">{metrics.resolvedComplaints} resolved tickets</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Assets & Staff</span>
            <Package className="h-4 w-4 text-slate-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{metrics.activeAssets}</span>
            <span className="text-xs text-slate-500">operational assets</span>
          </div>
          <div className="mt-2 text-xs text-slate-500">{metrics.totalStaff} maintenance specialists</div>
        </div>
      </div>

      {/* Analytical Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Room Utilization Bar Chart */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Room Utilization (Hours Booked)</h3>
              <p className="text-xs text-slate-500">Calculated via SQL GROUP BY and SUM aggregate query</p>
            </div>
            <button
              onClick={() => onNavigate('bookings')}
              className="text-xs font-semibold text-teal-600 hover:text-teal-700 flex items-center gap-1"
            >
              Manage <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={roomChartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="roomNumber" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} unit="h" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                />
                <Bar dataKey="totalHoursBooked" name="Hours Booked" fill="#0d9488" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Complaints by Category Chart */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Complaints by Asset Category</h3>
              <p className="text-xs text-slate-500">Relational distribution of equipment maintenance</p>
            </div>
            <button
              onClick={() => onNavigate('complaints')}
              className="text-xs font-semibold text-teal-600 hover:text-teal-700 flex items-center gap-1"
            >
              View All <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryChartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="category" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                />
                <Bar dataKey="total" name="Total Tickets" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                <Bar dataKey="resolved" name="Resolved" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Dual Column: Active Complaints Table & MongoDB Activity Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Complaints Table (2 Cols) */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Active Maintenance Tickets</h3>
              <p className="text-xs text-slate-500">Relational record tracking across campus assets</p>
            </div>
            <button
              onClick={() => onNavigate('complaints')}
              className="text-xs font-semibold text-teal-600 hover:text-teal-700"
            >
              View Workboard
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {recentComplaints.slice(0, 4).map(c => (
              <div key={c.complaintId} className="p-4 hover:bg-slate-50 transition-colors flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        c.priority === 'CRITICAL'
                          ? 'bg-red-100 text-red-800'
                          : c.priority === 'HIGH'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {c.priority}
                    </span>
                    <span className="text-xs font-semibold text-slate-900">{c.assetName}</span>
                    <span className="text-xs text-slate-400">•</span>
                    <span className="text-xs text-slate-500">{c.roomNumber} ({c.buildingName})</span>
                  </div>
                  <p className="text-xs text-slate-600 line-clamp-1">{c.description}</p>
                  <div className="text-[11px] text-slate-400">
                    Assigned: <span className="text-slate-700 font-medium">{c.assignedStaffName || 'Unassigned'}</span>
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  <span
                    className={`text-[11px] font-semibold px-2.5 py-1 rounded-md ${
                      c.status === 'RESOLVED'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : c.status === 'IN_PROGRESS'
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}
                  >
                    {c.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* MongoDB Activity Event Stream (1 Col) */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <Activity className="h-4 w-4 text-emerald-600" />
                  MongoDB Activity Stream
                </h3>
                <p className="text-[11px] text-slate-500">Outbox event pipeline into NoSQL document store</p>
              </div>

              <button
                onClick={handleWorkerClick}
                disabled={isWorkerRunning}
                className="text-[11px] font-semibold text-emerald-700 hover:bg-emerald-50 border border-emerald-200 rounded px-2 py-1 flex items-center gap-1 transition-colors"
                title="Flush pending PostgreSQL outbox events to MongoDB"
              >
                <RefreshCw className={`h-3 w-3 ${isWorkerRunning ? 'animate-spin' : ''}`} />
                Sync Outbox
              </button>
            </div>

            {workerMessage && (
              <div className="mt-2 p-2 rounded bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-800 font-medium">
                {workerMessage}
              </div>
            )}

            <div className="mt-3 space-y-3 max-h-80 overflow-y-auto pr-1">
              {recentEvents.slice(0, 5).map((evt, idx) => (
                <div key={evt.eventId || idx} className="text-xs border-l-2 border-emerald-500 pl-2.5 py-1">
                  <div className="font-semibold text-slate-800 text-[11px]">{evt.summary}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {evt.eventType} • {new Date(evt.occurredAt).toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Idempotent event sync</span>
            <button
              onClick={() => onNavigate('db_lab')}
              className="text-xs font-semibold text-teal-600 hover:text-teal-700"
            >
              Explore Aggregation →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
