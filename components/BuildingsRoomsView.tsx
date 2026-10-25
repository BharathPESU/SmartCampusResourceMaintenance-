'use client';

import React, { useState } from 'react';
import {
  Building2,
  DoorOpen,
  MapPin,
  Layers,
  Clock,
  Plus,
  Users,
  Activity,
  X,
} from 'lucide-react';
import { UserSession } from './Navbar';

interface BuildingsRoomsViewProps {
  currentUser: UserSession;
  buildings: any[];
  facilities: any[];
  facilityUsages: any[];
  rooms: any[];
  onRefreshData: () => Promise<void>;
}

export const BuildingsRoomsView: React.FC<BuildingsRoomsViewProps> = ({
  currentUser,
  buildings,
  facilities,
  facilityUsages,
  rooms,
  onRefreshData,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'buildings' | 'facilities' | 'usage'>('buildings');
  const [isBuildingModalOpen, setIsBuildingModalOpen] = useState(false);
  const [newBuildingName, setNewBuildingName] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newFloors, setNewFloors] = useState(4);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreateBuilding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBuildingName || !newLocation) return;
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/buildings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          buildingName: newBuildingName,
          location: newLocation,
          totalFloors: newFloors,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setIsBuildingModalOpen(false);
        setNewBuildingName('');
        setNewLocation('');
        await onRefreshData();
      } else {
        alert(data.error || 'Failed to create building');
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">Campus Infrastructure & Facilities</h2>
          <p className="text-xs text-slate-500">
            Physical campus buildings, departmental facilities, research labs, and student resource utilization.
          </p>
        </div>

        {currentUser.role === 'ADMIN' && (
          <button
            onClick={() => setIsBuildingModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
          >
            <Plus className="h-4 w-4 text-teal-400" />
            Add Building (Admin)
          </button>
        )}
      </div>

      {/* Sub Tabs */}
      <div className="flex border-b border-slate-200 gap-6">
        <button
          onClick={() => setActiveSubTab('buildings')}
          className={`pb-3 text-xs font-bold transition-colors border-b-2 ${
            activeSubTab === 'buildings'
              ? 'border-slate-900 text-slate-900'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Buildings ({buildings.length})
        </button>
        <button
          onClick={() => setActiveSubTab('facilities')}
          className={`pb-3 text-xs font-bold transition-colors border-b-2 ${
            activeSubTab === 'facilities'
              ? 'border-slate-900 text-slate-900'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Specialized Facilities ({facilities.length})
        </button>
        <button
          onClick={() => setActiveSubTab('usage')}
          className={`pb-3 text-xs font-bold transition-colors border-b-2 ${
            activeSubTab === 'usage'
              ? 'border-slate-900 text-slate-900'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Facility Usage Log ({facilityUsages.length})
        </button>
      </div>

      {/* Buildings Tab Content */}
      {activeSubTab === 'buildings' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {buildings.map(b => {
            const buildingRooms = rooms.filter(r => r.building_id === b.building_id);
            return (
              <div key={b.building_id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">{b.building_name}</h3>
                    <div className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                      <MapPin className="h-3.5 w-3.5 text-slate-400" />
                      {b.location}
                    </div>
                  </div>
                  <span className="p-2 bg-slate-100 rounded-lg text-slate-700">
                    <Building2 className="h-5 w-5" />
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 py-3 border-y border-slate-100 text-center">
                  <div>
                    <div className="text-base font-bold text-slate-900">{b.total_floors}</div>
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">Floors</div>
                  </div>
                  <div>
                    <div className="text-base font-bold text-slate-900">{buildingRooms.length}</div>
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">Rooms</div>
                  </div>
                  <div>
                    <div className="text-base font-bold text-slate-900">{b.total_facilities || 1}</div>
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">Facilities</div>
                  </div>
                </div>

                <div>
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Sample Rooms in Complex
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {buildingRooms.slice(0, 4).map(rm => (
                      <span
                        key={rm.room_id}
                        className="text-[11px] font-medium bg-slate-100 text-slate-700 px-2 py-1 rounded"
                      >
                        {rm.room_number} ({rm.room_type?.slice(0, 8)})
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Facilities Tab Content */}
      {activeSubTab === 'facilities' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {facilities.map(f => (
            <div key={f.facility_id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-sm text-slate-900">{f.facility_name}</h3>
                  <div className="text-xs text-slate-500 mt-0.5">{f.building_name}</div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  {f.status}
                </span>
              </div>

              <div className="p-2.5 bg-slate-50 rounded-lg text-xs flex items-center justify-between text-slate-600">
                <span className="flex items-center gap-1.5 font-medium">
                  <Clock className="h-3.5 w-3.5 text-slate-400" />
                  {f.operating_hours}
                </span>
                <span className="text-[11px] text-slate-500">
                  {f.total_usages || 0} recorded sessions
                </span>
              </div>

              <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-100 flex items-center justify-between">
                <span>Staff: {f.assigned_staff_count || 1} technician</span>
                <span className="text-teal-600 font-semibold">Active Hub</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Facility Usage Table */}
      {activeSubTab === 'usage' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900">Facility Access & Laboratory Usage Records</h3>
            <p className="text-xs text-slate-500">M:N relationship represented via facility_usage associative entity</p>
          </div>
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Facility Space</th>
                <th className="px-4 py-3">Research / Usage Purpose</th>
                <th className="px-4 py-3">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {facilityUsages.map(u => (
                <tr key={u.usage_id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-semibold text-slate-900">{u.user_name}</td>
                  <td className="px-4 py-3 text-slate-700">{u.facility_name}</td>
                  <td className="px-4 py-3 text-slate-600">{u.purpose}</td>
                  <td className="px-4 py-3 text-slate-400">{new Date(u.used_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Building Modal */}
      {isBuildingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white w-full max-w-md rounded-xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm">Add Campus Building</h3>
              <button onClick={() => setIsBuildingModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleCreateBuilding} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Building Name</label>
                <input
                  type="text"
                  placeholder="e.g. Grace Hopper Robotics Pavilion"
                  value={newBuildingName}
                  onChange={e => setNewBuildingName(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Location / Sector</label>
                <input
                  type="text"
                  placeholder="e.g. East Science Quadrangle"
                  value={newLocation}
                  onChange={e => setNewLocation(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Total Floors</label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={newFloors}
                  onChange={e => setNewFloors(Number(e.target.value))}
                  className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2"
                  required
                />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsBuildingModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold"
                >
                  {isSubmitting ? 'Creating...' : 'Create Building'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
