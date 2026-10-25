'use client';

import React from 'react';
import {
  Users2,
  Wrench,
  ShieldAlert,
  Building,
  DollarSign,
  Lock,
} from 'lucide-react';
import { UserSession } from './Navbar';

interface StaffViewProps {
  currentUser: UserSession;
  staffList: any[];
}

export const StaffView: React.FC<StaffViewProps> = ({
  currentUser,
  staffList,
}) => {
  const isAdmin = currentUser.role === 'ADMIN';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">Facilities & Maintenance Staff Directory</h2>
        <p className="text-xs text-slate-500">
          Supervisory hierarchy, technical specializations, facility links, and workload distribution.
        </p>
      </div>

      {/* Security Notice for Salary Visibility */}
      <div className={`p-4 rounded-xl border text-xs flex items-center justify-between ${
        isAdmin ? 'bg-purple-50 border-purple-200 text-purple-900' : 'bg-slate-100 border-slate-200 text-slate-600'
      }`}>
        <div className="flex items-center gap-2">
          {isAdmin ? (
            <DollarSign className="h-4 w-4 text-purple-700" />
          ) : (
            <Lock className="h-4 w-4 text-slate-500" />
          )}
          <span>
            {isAdmin
              ? 'Administrator Access Granted: Staff compensation records are decrypted and visible.'
              : 'Role-Based Access Control Enforced: Staff salary and compensation information is masked for non-administrative roles.'}
          </span>
        </div>
        <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-white border border-slate-300">
          {currentUser.role}
        </span>
      </div>

      {/* Staff Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {staffList.map(staff => (
          <div key={staff.staff_id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold text-base text-slate-900">{staff.staff_name}</h3>
                <div className="text-xs text-teal-700 font-semibold flex items-center gap-1 mt-0.5">
                  <Wrench className="h-3.5 w-3.5" />
                  {staff.designation}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">{staff.email} • {staff.department}</div>
              </div>
              <span className="p-2.5 bg-slate-900 text-teal-400 rounded-lg">
                <Users2 className="h-5 w-5" />
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Base Facility:</span>
                <span className="font-medium text-slate-800">{staff.facility_name || 'Campus Wide'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Reports To (Supervisor):</span>
                <span className="font-medium text-slate-800">
                  {staff.supervisor_name ? `${staff.supervisor_name}` : 'Executive Facility Leadership'}
                </span>
              </div>
              <div className="flex justify-between pt-1 border-t border-slate-200">
                <span className="text-slate-500">Compensation:</span>
                <span className="font-bold text-slate-900 font-mono">
                  {isAdmin && staff.salary
                    ? `$${Number(staff.salary).toLocaleString()}/year`
                    : '•••••• [RESTRICTED]'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-center pt-1">
              <div className="p-2.5 bg-amber-50 border border-amber-100 rounded-lg">
                <div className="text-lg font-bold text-amber-800">{staff.active_workload || 0}</div>
                <div className="text-[10px] text-amber-700 uppercase font-semibold">Active Tickets</div>
              </div>
              <div className="p-2.5 bg-emerald-50 border border-emerald-100 rounded-lg">
                <div className="text-lg font-bold text-emerald-800">{staff.resolved_count || 0}</div>
                <div className="text-[10px] text-emerald-700 uppercase font-semibold">Resolved Tickets</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
