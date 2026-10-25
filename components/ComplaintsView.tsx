'use client';

import React, { useState } from 'react';
import {
  AlertTriangle,
  Plus,
  Filter,
  CheckCircle2,
  Clock,
  User,
  Wrench,
  X,
  History,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { UserSession } from './Navbar';

interface ComplaintsViewProps {
  currentUser: UserSession;
  complaints: any[];
  assets: any[];
  staffList: any[];
  onRefreshComplaints: () => Promise<void>;
}

export const ComplaintsView: React.FC<ComplaintsViewProps> = ({
  currentUser,
  complaints,
  assets,
  staffList,
  onRefreshComplaints,
}) => {
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [isRaiseModalOpen, setIsRaiseModalOpen] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState<any | null>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [isLoadingAudit, setIsLoadingAudit] = useState(false);

  // Raise Complaint Form states
  const [targetAssetId, setTargetAssetId] = useState('');
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('MEDIUM');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Status transition states inside detail drawer
  const [assignStaffId, setAssignStaffId] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [isTransitioning, setIsTransitioning] = useState(false);

  const handleOpenRaiseModal = () => {
    setFormError(null);
    setTargetAssetId(assets[0]?.asset_id || '');
    setDescription('');
    setPriority('MEDIUM');
    setIsRaiseModalOpen(true);
  };

  const handleRaiseComplaint = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!targetAssetId || !description.trim()) {
      setFormError('Please select an asset and describe the issue.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/complaints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          raisedByUserId: currentUser.userId,
          assetId: targetAssetId,
          description: description.trim(),
          priority,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setFormError(data.error || 'Failed to submit complaint.');
        setIsSubmitting(false);
        return;
      }

      setIsRaiseModalOpen(false);
      await onRefreshComplaints();
    } catch (err: any) {
      setFormError(err.message || 'Network error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectComplaint = async (c: any) => {
    setSelectedComplaint(c);
    setResolutionNotes(c.resolutionNotes || '');
    setAssignStaffId(c.assignedStaffId || (staffList[0]?.staff_id ?? ''));
    setIsLoadingAudit(true);
    try {
      const res = await fetch(`/api/complaints?id=${c.complaintId}&audit=true`);
      const data = await res.json();
      setAuditLogs(data.logs || []);
    } catch (e) {
      console.error('Audit fetch error:', e);
    } finally {
      setIsLoadingAudit(false);
    }
  };

  const handleAssignStaff = async () => {
    if (!selectedComplaint || !assignStaffId) return;
    setIsTransitioning(true);
    try {
      const res = await fetch('/api/complaints', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'ASSIGN',
          complaintId: selectedComplaint.complaintId,
          staffId: assignStaffId,
          userId: currentUser.userId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        await onRefreshComplaints();
        // Refresh local selected
        const updatedRes = await fetch(`/api/complaints?id=${selectedComplaint.complaintId}`);
        const updatedData = await updatedRes.json();
        if (updatedData.complaint) handleSelectComplaint(updatedData.complaint);
      } else {
        alert(data.error || 'Assignment failed');
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsTransitioning(false);
    }
  };

  const handleUpdateStatus = async (nextStatus: string) => {
    if (!selectedComplaint) return;
    setIsTransitioning(true);
    try {
      const res = await fetch('/api/complaints', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'UPDATE_STATUS',
          complaintId: selectedComplaint.complaintId,
          status: nextStatus,
          userId: currentUser.userId,
          resolutionNotes: resolutionNotes.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        await onRefreshComplaints();
        const updatedRes = await fetch(`/api/complaints?id=${selectedComplaint.complaintId}`);
        const updatedData = await updatedRes.json();
        if (updatedData.complaint) handleSelectComplaint(updatedData.complaint);
      } else {
        alert(data.error || 'Status update failed');
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsTransitioning(false);
    }
  };

  const filtered = complaints.filter(c => {
    const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter;
    const matchesPriority = priorityFilter === 'ALL' || c.priority === priorityFilter;
    return matchesStatus && matchesPriority;
  });

  return (
    <div className="space-y-6">
      {/* Header and Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">Maintenance & Complaints Lifecycle</h2>
          <p className="text-xs text-slate-500">
            Work order tracking with strict transition enforcement, PostgreSQL trigger audit trail, and automatic semantic indexing.
          </p>
        </div>

        <button
          onClick={handleOpenRaiseModal}
          className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
        >
          <Plus className="h-4 w-4" />
          Report Equipment Issue
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {['ALL', 'OPEN', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED'].map(st => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                statusFilter === st
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-3.5 w-3.5 text-slate-400" />
          <span className="text-xs font-medium text-slate-500">Priority:</span>
          <select
            value={priorityFilter}
            onChange={e => setPriorityFilter(e.target.value)}
            className="text-xs border border-slate-300 rounded-md px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-teal-500"
          >
            <option value="ALL">All Priorities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
        </div>
      </div>

      {/* Complaints List Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Priority & Status</th>
                <th className="px-4 py-3">Asset & Space</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3">Reported By</th>
                <th className="px-4 py-3">Technician</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                    No complaints matching current filters.
                  </td>
                </tr>
              ) : (
                filtered.map(c => (
                  <tr
                    key={c.complaintId}
                    onClick={() => handleSelectComplaint(c)}
                    className="hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 space-y-1">
                      <div>
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
                      </div>
                      <span
                        className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                          c.status === 'RESOLVED'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : c.status === 'IN_PROGRESS'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {c.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-900">{c.assetName}</div>
                      <div className="text-[11px] text-slate-500">
                        {c.roomNumber} • {c.buildingName}
                      </div>
                    </td>
                    <td className="px-4 py-3 max-w-sm">
                      <p className="text-slate-700 line-clamp-2">{c.description}</p>
                      {c.resolutionNotes && (
                        <p className="text-[11px] text-emerald-700 mt-0.5 italic line-clamp-1">
                          Fix: {c.resolutionNotes}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800">{c.reporterName}</div>
                      <div className="text-[10px] text-slate-400">{new Date(c.dateRaised).toLocaleDateString()}</div>
                    </td>
                    <td className="px-4 py-3">
                      {c.assignedStaffName ? (
                        <span className="font-medium text-slate-800 flex items-center gap-1">
                          <Wrench className="h-3 w-3 text-teal-600" />
                          {c.assignedStaffName}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Unassigned</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button className="text-xs font-semibold text-teal-600 hover:text-teal-700">
                        View & Manage →
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Complaint Detail Drawer */}
      {selectedComplaint && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-900/40 backdrop-blur-xs p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-xl h-full rounded-none sm:rounded-xl shadow-2xl border-l sm:border border-slate-200 flex flex-col justify-between overflow-y-auto">
            <div>
              {/* Drawer Header */}
              <div className="p-5 border-b border-slate-200 bg-slate-900 text-white flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500 text-slate-900">
                      {selectedComplaint.priority}
                    </span>
                    <span className="text-xs text-slate-400">Ticket #{selectedComplaint.complaintId.slice(0, 8)}</span>
                  </div>
                  <h3 className="font-bold text-base mt-1 text-white">{selectedComplaint.assetName}</h3>
                </div>
                <button
                  onClick={() => setSelectedComplaint(null)}
                  className="p-1 text-slate-400 hover:text-white rounded-lg"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Drawer Body */}
              <div className="p-5 space-y-5 text-xs">
                {/* Space info */}
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-slate-400 text-[11px] block">Location</span>
                    <span className="font-bold text-slate-800">
                      {selectedComplaint.roomNumber} ({selectedComplaint.buildingName})
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px] block">Category</span>
                    <span className="font-bold text-slate-800">{selectedComplaint.assetCategory}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px] block">Reported By</span>
                    <span className="font-semibold text-slate-800">{selectedComplaint.reporterName}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px] block">Date Filed</span>
                    <span className="font-semibold text-slate-800">
                      {new Date(selectedComplaint.dateRaised).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <h4 className="font-bold text-slate-900 mb-1">Issue Description</h4>
                  <div className="p-3 bg-white border border-slate-200 rounded-lg text-slate-700 leading-relaxed">
                    {selectedComplaint.description}
                  </div>
                </div>

                {/* State Machine Status & Management Controls */}
                <div className="p-4 bg-teal-50/50 rounded-xl border border-teal-100 space-y-3">
                  <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
                    <Wrench className="h-4 w-4 text-teal-700" />
                    Lifecycle State & Actions
                  </h4>

                  {/* Stepper Display */}
                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 py-1">
                    <span className={selectedComplaint.status === 'OPEN' ? 'text-amber-600 font-bold' : ''}>1. OPEN</span>
                    <ArrowRight className="h-3 w-3 text-slate-300" />
                    <span className={selectedComplaint.status === 'ASSIGNED' ? 'text-teal-600 font-bold' : ''}>2. ASSIGNED</span>
                    <ArrowRight className="h-3 w-3 text-slate-300" />
                    <span className={selectedComplaint.status === 'IN_PROGRESS' ? 'text-blue-600 font-bold' : ''}>3. IN PROGRESS</span>
                    <ArrowRight className="h-3 w-3 text-slate-300" />
                    <span className={selectedComplaint.status === 'RESOLVED' ? 'text-emerald-600 font-bold' : ''}>4. RESOLVED</span>
                  </div>

                  {/* Admin Staff Assignment */}
                  {currentUser.role === 'ADMIN' && selectedComplaint.status === 'OPEN' && (
                    <div className="space-y-2 pt-2 border-t border-teal-200">
                      <label className="font-semibold text-slate-700">Assign to Technician (Admin Action):</label>
                      <div className="flex gap-2">
                        <select
                          value={assignStaffId}
                          onChange={e => setAssignStaffId(e.target.value)}
                          className="flex-1 text-xs border border-slate-300 rounded px-2 py-1.5 bg-white"
                        >
                          {staffList.map(s => (
                            <option key={s.staff_id} value={s.staff_id}>
                              {s.staff_name} ({s.designation})
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={handleAssignStaff}
                          disabled={isTransitioning}
                          className="px-3 py-1.5 bg-slate-900 text-white rounded text-xs font-semibold hover:bg-slate-800"
                        >
                          Assign
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Staff / Admin Status Actions */}
                  {(currentUser.role === 'ADMIN' || currentUser.role === 'MAINTENANCE_STAFF') && (
                    <div className="space-y-2 pt-2 border-t border-teal-200">
                      {selectedComplaint.status === 'ASSIGNED' && (
                        <button
                          onClick={() => handleUpdateStatus('IN_PROGRESS')}
                          disabled={isTransitioning}
                          className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-xs transition-colors"
                        >
                          Mark as IN PROGRESS (Begin Maintenance)
                        </button>
                      )}

                      {selectedComplaint.status === 'IN_PROGRESS' && (
                        <div className="space-y-2">
                          <label className="font-semibold text-slate-700">Resolution Notes (Required):</label>
                          <textarea
                            rows={2}
                            placeholder="Describe how the issue was fixed, parts replaced, or diagnostic tests completed..."
                            value={resolutionNotes}
                            onChange={e => setResolutionNotes(e.target.value)}
                            className="w-full text-xs border border-slate-300 rounded p-2 focus:ring-1 focus:ring-teal-500"
                          />
                          <button
                            onClick={() => handleUpdateStatus('RESOLVED')}
                            disabled={isTransitioning || !resolutionNotes.trim()}
                            className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-lg text-xs transition-colors"
                          >
                            Complete Work & Mark RESOLVED
                          </button>
                        </div>
                      )}

                      {selectedComplaint.status === 'RESOLVED' && (
                        <div className="text-xs text-emerald-800 bg-emerald-100 p-2.5 rounded font-medium flex items-center justify-between">
                          <span>Maintenance resolved and verified.</span>
                          {currentUser.role === 'ADMIN' && (
                            <button
                              onClick={() => handleUpdateStatus('OPEN')}
                              className="text-xs underline font-bold"
                            >
                              Reopen Ticket
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Audit Trail Log */}
                <div className="space-y-2">
                  <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
                    <History className="h-4 w-4 text-slate-500" />
                    PostgreSQL Trigger Audit Log
                  </h4>
                  <div className="border border-slate-200 rounded-lg p-3 bg-slate-50 max-h-48 overflow-y-auto space-y-2">
                    {isLoadingAudit ? (
                      <div className="text-slate-400">Loading audit trail...</div>
                    ) : auditLogs.length === 0 ? (
                      <div className="text-slate-400 italic">Initial creation state recorded.</div>
                    ) : (
                      auditLogs.map((log, i) => (
                        <div key={log.auditId || i} className="text-[11px] border-l-2 border-slate-400 pl-2">
                          <div className="font-semibold text-slate-800">
                            Status changed: <span className="text-teal-700">{log.oldStatus || 'NONE'}</span> →{' '}
                            <span className="text-emerald-700">{log.newStatus}</span>
                          </div>
                          <div className="text-slate-500 text-[10px]">
                            {log.notes || 'Status updated'} • {new Date(log.createdAt).toLocaleString()}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button
                onClick={() => setSelectedComplaint(null)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-200"
              >
                Close Drawer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Raise Complaint Modal */}
      {isRaiseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white w-full max-w-lg rounded-xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm">Report Campus Equipment Issue</h3>
                <p className="text-xs text-slate-400">Directly registers ticket and generates vector embedding</p>
              </div>
              <button onClick={() => setIsRaiseModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleRaiseComplaint} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-lg text-xs">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Select Campus Asset / Equipment
                </label>
                <select
                  value={targetAssetId}
                  onChange={e => setTargetAssetId(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  required
                >
                  {assets.map(a => (
                    <option key={a.asset_id} value={a.asset_id}>
                      {a.asset_name} ({a.category}) - Room {a.room_number} ({a.building_name})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Urgency / Priority Level
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const).map(pr => (
                    <button
                      type="button"
                      key={pr}
                      onClick={() => setPriority(pr)}
                      className={`py-1.5 rounded text-xs font-bold border transition-colors ${
                        priority === pr
                          ? pr === 'CRITICAL'
                            ? 'bg-red-600 text-white border-red-700'
                            : pr === 'HIGH'
                            ? 'bg-amber-600 text-white border-amber-700'
                            : 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {pr}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Description of Malfunction or Failure
                </label>
                <textarea
                  rows={3}
                  placeholder="Detail the symptoms (e.g. Laser projector shuts down with overheat warning, AC blowing warm air, or network switch port drop)..."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  required
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsRaiseModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
                >
                  {isSubmitting ? 'Registering Ticket...' : 'Submit Maintenance Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
