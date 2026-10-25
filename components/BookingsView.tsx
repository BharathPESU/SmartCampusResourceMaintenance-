'use client';

import React, { useState } from 'react';
import {
  CalendarCheck,
  Clock,
  MapPin,
  Users,
  Search,
  Plus,
  X,
  AlertCircle,
  CheckCircle2,
  Trash2,
  ShieldAlert,
} from 'lucide-react';
import { UserSession } from './Navbar';

interface BookingsViewProps {
  currentUser: UserSession;
  rooms: any[];
  bookings: any[];
  onRefreshBookings: () => Promise<void>;
}

export const BookingsView: React.FC<BookingsViewProps> = ({
  currentUser,
  rooms,
  bookings,
  onRefreshBookings,
}) => {
  const [selectedRoomId, setSelectedRoomId] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('ALL');

  // Form states
  const [targetRoomId, setTargetRoomId] = useState('');
  const [startTime, setStartTime] = useState(
    new Date(Date.now() + 2 * 3600 * 1000).toISOString().slice(0, 16)
  );
  const [endTime, setEndTime] = useState(
    new Date(Date.now() + 4 * 3600 * 1000).toISOString().slice(0, 16)
  );
  const [purpose, setPurpose] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{ code: string; roomNumber: string } | null>(null);

  const handleOpenBookingModal = (roomId?: string) => {
    setFormError(null);
    setSuccessInfo(null);
    setTargetRoomId(roomId || (rooms[0]?.room_id ?? ''));
    setPurpose('');
    setIsModalOpen(true);
  };

  const handleCreateBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSuccessInfo(null);

    if (!targetRoomId || !startTime || !endTime || !purpose.trim()) {
      setFormError('Please fill in all reservation fields.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.userId,
          roomId: targetRoomId,
          startTime: new Date(startTime).toISOString(),
          endTime: new Date(endTime).toISOString(),
          purpose: purpose.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        if (data.conflict) {
          setFormError('Conflict Rejection: The room is already reserved for an overlapping time window. Exclusion constraint enforced.');
        } else {
          setFormError(data.error || 'Failed to complete reservation.');
        }
        setIsSubmitting(false);
        return;
      }

      const roomObj = rooms.find(r => r.room_id === targetRoomId);
      setSuccessInfo({
        code: data.confirmationCode || 'CONF-OK',
        roomNumber: roomObj?.room_number || 'Selected Room',
      });
      await onRefreshBookings();
    } catch (err: any) {
      setFormError(err.message || 'Network error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    if (!confirm('Are you sure you want to cancel this booking? This will immediately free the space for others.')) {
      return;
    }

    try {
      const res = await fetch('/api/bookings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId,
          userId: currentUser.userId,
          isAdmin: currentUser.role === 'ADMIN',
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || 'Cancellation failed');
      } else {
        await onRefreshBookings();
      }
    } catch (err: any) {
      alert(err.message || 'Error cancelling booking');
    }
  };

  const filteredRooms = rooms.filter(r => {
    const matchesSearch =
      r.room_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.building_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'ALL' || r.room_type === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6">
      {/* Header and Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">Room Availability & Bookings</h2>
          <p className="text-xs text-slate-500">
            Database-level concurrency exclusion ensures no two overlapping reservations can be booked for the same space.
          </p>
        </div>

        <button
          onClick={() => handleOpenBookingModal()}
          className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
        >
          <Plus className="h-4 w-4 text-teal-400" />
          Reserve a Room
        </button>
      </div>

      {/* Room Directory & Search Filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by room number or building (e.g. ENG-101)..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full text-xs pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-slate-600">Type:</label>
            <select
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
              className="text-xs border border-slate-300 rounded-lg px-2.5 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="ALL">All Room Types</option>
              <option value="LECTURE_HALL">Lecture Hall</option>
              <option value="COMPUTER_LAB">Computer Lab</option>
              <option value="SEMINAR_ROOM">Seminar Room</option>
              <option value="CONFERENCE_ROOM">Conference Room</option>
              <option value="STUDY_POD">Study Pod</option>
            </select>
          </div>
        </div>

        {/* Rooms Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {filteredRooms.map(room => (
            <div
              key={room.room_id}
              className="border border-slate-200 rounded-lg p-4 hover:border-teal-500 hover:shadow-xs transition-all bg-slate-50/50 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-slate-900">{room.room_number}</span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-teal-100 text-teal-800">
                    {room.room_type?.replace('_', ' ')}
                  </span>
                </div>
                <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                  <MapPin className="h-3 w-3 text-slate-400" />
                  {room.building_name} (Floor {room.floor_no})
                </div>
                <div className="mt-3 flex items-center gap-3 text-xs text-slate-600">
                  <span className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5 text-slate-400" />
                    Cap: {room.capacity}
                  </span>
                  <span>•</span>
                  <span>{room.total_assets || 0} Assets</span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between">
                <span className="text-[11px] text-emerald-700 font-medium">Ready for Booking</span>
                <button
                  onClick={() => handleOpenBookingModal(room.room_id)}
                  className="px-2.5 py-1 text-xs font-semibold bg-white border border-slate-300 rounded hover:bg-teal-50 hover:border-teal-400 hover:text-teal-700 transition-colors"
                >
                  Book Now
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bookings History & Active Reservations Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Campus Reservations & Confirmation Records</h3>
            <p className="text-xs text-slate-500">Authoritative PostgreSQL booking records and confirmation codes</p>
          </div>
          <span className="text-xs font-semibold text-slate-500">{bookings.length} reservations</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Room & Building</th>
                <th className="px-4 py-3">Reserved By</th>
                <th className="px-4 py-3">Time Window</th>
                <th className="px-4 py-3">Purpose</th>
                <th className="px-4 py-3">Confirmation Code</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {bookings.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                    No reservations recorded. Click &ldquo;Reserve a Room&rdquo; to create the first booking.
                  </td>
                </tr>
              ) : (
                bookings.map(b => {
                  const canCancel =
                    currentUser.role === 'ADMIN' || b.userId === currentUser.userId;
                  const isCancelled = b.status === 'CANCELLED';

                  return (
                    <tr key={b.bookingId} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900">{b.roomNumber}</div>
                        <div className="text-[11px] text-slate-400">{b.buildingName}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-800">{b.userName}</div>
                        <div className="text-[10px] text-slate-400">{b.userEmail}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-slate-800 font-medium">
                          {new Date(b.startTime).toLocaleDateString()}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {new Date(b.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -{' '}
                          {new Date(b.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600 max-w-xs truncate">{b.purpose}</td>
                      <td className="px-4 py-3">
                        {b.confirmationCode ? (
                          <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                            {b.confirmationCode}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">None</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            b.status === 'CONFIRMED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : b.status === 'CANCELLED'
                              ? 'bg-slate-200 text-slate-600'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {b.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {!isCancelled && canCancel && (
                          <button
                            onClick={() => handleCancelBooking(b.bookingId)}
                            className="text-xs text-red-600 hover:text-red-800 font-medium flex items-center gap-1 ml-auto"
                            title="Cancel reservation"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Cancel
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reservation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white w-full max-w-lg rounded-xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm">Reserve Campus Space</h3>
                <p className="text-xs text-slate-400">Atomic Booking Transaction & Confirmation</p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateBooking} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-lg text-xs flex items-start gap-2">
                  <ShieldAlert className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
                  <div>
                    <span className="font-bold">Reservation Blocked: </span>
                    {formError}
                  </div>
                </div>
              )}

              {successInfo && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-lg text-xs space-y-2">
                  <div className="flex items-center gap-2 font-bold text-sm text-emerald-800">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    Booking Confirmed Successfully!
                  </div>
                  <p>Space {successInfo.roomNumber} has been reserved. A confirmation code has been generated and transactional outbox event registered for MongoDB.</p>
                  <div className="p-2 bg-white rounded border border-emerald-300 font-mono text-center font-bold text-sm text-slate-900">
                    {successInfo.code}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Select Room
                </label>
                <select
                  value={targetRoomId}
                  onChange={e => setTargetRoomId(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  required
                >
                  {rooms.map(r => (
                    <option key={r.room_id} value={r.room_id}>
                      {r.room_number} - {r.building_name} ({r.room_type}, Cap: {r.capacity})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Start Time
                  </label>
                  <input
                    type="datetime-local"
                    value={startTime}
                    onChange={e => setStartTime(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    End Time
                  </label>
                  <input
                    type="datetime-local"
                    value={endTime}
                    onChange={e => setEndTime(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Reservation Purpose
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. CS480 Database Seminar Lecture or Robotics Competition Prep..."
                  value={purpose}
                  onChange={e => setPurpose(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  required
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-100"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
                >
                  {isSubmitting ? 'Verifying Availability...' : 'Confirm Reservation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
