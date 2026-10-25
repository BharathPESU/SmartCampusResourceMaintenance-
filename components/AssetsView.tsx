'use client';

import React, { useState } from 'react';
import {
  Package,
  Search,
  Filter,
  AlertTriangle,
  CheckCircle2,
  MapPin,
  Wrench,
} from 'lucide-react';
import { UserSession } from './Navbar';

interface AssetsViewProps {
  currentUser: UserSession;
  assets: any[];
  onRefreshAssets: () => Promise<void>;
  onSelectAssetForComplaint?: (assetId: string) => void;
}

export const AssetsView: React.FC<AssetsViewProps> = ({
  currentUser,
  assets,
  onRefreshAssets,
  onSelectAssetForComplaint,
}) => {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const filtered = assets.filter(a => {
    const matchesSearch =
      a.asset_name?.toLowerCase().includes(search.toLowerCase()) ||
      a.room_number?.toLowerCase().includes(search.toLowerCase()) ||
      a.building_name?.toLowerCase().includes(search.toLowerCase());
    const matchesCat = categoryFilter === 'ALL' || a.category === categoryFilter;
    const matchesStatus = statusFilter === 'ALL' || a.status === statusFilter;
    return matchesSearch && matchesCat && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">Campus Asset & Equipment Inventory</h2>
        <p className="text-xs text-slate-500">
          Normalized ASSET entity linked to physical rooms with operational health monitoring and maintenance histories.
        </p>
      </div>

      {/* Filters Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search assets by equipment name or room..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full text-xs pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="text-xs border border-slate-300 rounded-lg px-2.5 py-2 bg-white"
          >
            <option value="ALL">All Categories</option>
            <option value="AV_EQUIPMENT">AV Equipment</option>
            <option value="HVAC">HVAC</option>
            <option value="IT_NETWORK">IT Network</option>
            <option value="ELECTRICAL">Electrical</option>
            <option value="FURNITURE">Furniture</option>
            <option value="PLUMBING">Plumbing</option>
          </select>

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="text-xs border border-slate-300 rounded-lg px-2.5 py-2 bg-white"
          >
            <option value="ALL">All Statuses</option>
            <option value="OPERATIONAL">Operational</option>
            <option value="MAINTENANCE_REQUIRED">Maintenance Required</option>
            <option value="RETIRED">Retired</option>
          </select>
        </div>
      </div>

      {/* Assets Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
            <tr>
              <th className="px-4 py-3">Asset Name & Category</th>
              <th className="px-4 py-3">Installed Room Location</th>
              <th className="px-4 py-3">Operational Status</th>
              <th className="px-4 py-3">Complaint History</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                  No assets found matching current criteria.
                </td>
              </tr>
            ) : (
              filtered.map(asset => (
                <tr key={asset.asset_id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-bold text-slate-900 flex items-center gap-1.5">
                      <Package className="h-3.5 w-3.5 text-slate-400" />
                      {asset.asset_name}
                    </div>
                    <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                      {asset.category?.replace('_', ' ')}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-800">Room {asset.room_number}</div>
                    <div className="text-[11px] text-slate-500">{asset.building_name}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        asset.status === 'OPERATIONAL'
                          ? 'bg-emerald-100 text-emerald-800'
                          : asset.status === 'MAINTENANCE_REQUIRED'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {asset.status === 'OPERATIONAL' ? (
                        <CheckCircle2 className="h-3 w-3" />
                      ) : (
                        <AlertTriangle className="h-3 w-3" />
                      )}
                      {asset.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    <div>{asset.total_complaints || 0} tickets logged</div>
                    {asset.active_complaints > 0 && (
                      <div className="text-[11px] text-amber-600 font-semibold">
                        {asset.active_complaints} in progress
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-[11px] font-semibold text-teal-600">
                      ID: {asset.asset_id.slice(0, 8)}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
