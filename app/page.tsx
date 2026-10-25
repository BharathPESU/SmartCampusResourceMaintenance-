'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Navbar, UserSession } from '@/components/Navbar';
import { Sidebar, NavigationTab } from '@/components/Sidebar';
import { DashboardView } from '@/components/DashboardView';
import { BookingsView } from '@/components/BookingsView';
import { ComplaintsView } from '@/components/ComplaintsView';
import { BuildingsRoomsView } from '@/components/BuildingsRoomsView';
import { AssetsView } from '@/components/AssetsView';
import { StaffView } from '@/components/StaffView';
import { SemanticSearchView } from '@/components/SemanticSearchView';
import { DatabaseLabView } from '@/components/DatabaseLabView';
import { DocumentationView } from '@/components/DocumentationView';

export default function SmartCampusHome() {
  const [currentUser, setCurrentUser] = useState<UserSession>({
    userId: '11111111-1111-1111-1111-111111111111',
    email: 'admin@campus.edu',
    name: 'Eleanor Vance',
    role: 'ADMIN',
    department: 'Campus Operations & Facilities',
    designation: 'Director of Campus Operations',
  });

  const [availableUsers, setAvailableUsers] = useState<UserSession[]>([]);
  const [activeTab, setActiveTab] = useState<NavigationTab>('dashboard');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isWorkerRunning, setIsWorkerRunning] = useState(false);

  // Application data
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [rooms, setRooms] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [complaints, setComplaints] = useState<any[]>([]);
  const [buildings, setBuildings] = useState<any[]>([]);
  const [facilities, setFacilities] = useState<any[]>([]);
  const [facilityUsages, setFacilityUsages] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [dbLabData, setDbLabData] = useState<any>(null);

  const fetchAllData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const [
        authRes,
        analyticsRes,
        roomsRes,
        bookingsRes,
        complaintsRes,
        buildingsRes,
        facilitiesRes,
        assetsRes,
        staffRes,
        dbLabRes,
      ] = await Promise.all([
        fetch('/api/auth'),
        fetch('/api/analytics'),
        fetch('/api/rooms'),
        fetch('/api/bookings'),
        fetch('/api/complaints'),
        fetch('/api/buildings'),
        fetch('/api/facilities'),
        fetch('/api/assets'),
        fetch('/api/staff', { headers: { 'x-user-role': currentUser.role } }),
        fetch('/api/db-lab'),
      ]);

      const authData = await authRes.json();
      if (authData.availableDemoUsers) {
        setAvailableUsers(authData.availableDemoUsers);
      }

      const anData = await analyticsRes.json();
      setAnalyticsData(anData);

      const rData = await roomsRes.json();
      setRooms(rData.rooms || []);

      const bData = await bookingsRes.json();
      setBookings(bData.bookings || []);

      const cData = await complaintsRes.json();
      setComplaints(cData.complaints || []);

      const buData = await buildingsRes.json();
      setBuildings(buData.buildings || []);

      const fData = await facilitiesRes.json();
      setFacilities(fData.facilities || []);
      setFacilityUsages(fData.usages || []);

      const aData = await assetsRes.json();
      setAssets(aData.assets || []);

      const sData = await staffRes.json();
      setStaffList(sData.staff || []);

      const dData = await dbLabRes.json();
      setDbLabData(dData);
    } catch (err) {
      console.error('Error fetching campus data:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, [currentUser.role]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const handleSwitchUser = async (targetUser: UserSession) => {
    setCurrentUser(targetUser);
    try {
      await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: targetUser.userId, role: targetUser.role }),
      });
      // Refetch data so role-sensitive info (like salary masking) updates immediately
      await fetchAllData();
    } catch (e) {
      console.error('User switch error:', e);
    }
  };

  const handleTriggerWorker = async () => {
    setIsWorkerRunning(true);
    try {
      await fetch('/api/worker', { method: 'POST' });
      await fetchAllData();
    } catch (e) {
      console.error('Worker run failed:', e);
    } finally {
      setIsWorkerRunning(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 flex flex-col font-sans antialiased selection:bg-teal-500 selection:text-white">
      {/* Top Navbar */}
      <Navbar
        currentUser={currentUser}
        onSwitchUser={handleSwitchUser}
        availableUsers={availableUsers.length > 0 ? availableUsers : [currentUser]}
        dbStatus={dbLabData?.dbStatus}
        mongoStatus={dbLabData?.mongoStatus}
        onRefreshData={fetchAllData}
        isRefreshing={isRefreshing}
      />

      {/* Main Layout Shell */}
      <div className="flex-1 flex flex-col md:flex-row max-w-7xl w-full mx-auto">
        {/* Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          userRole={currentUser.role}
          counts={{
            activeBookings: bookings.filter(b => b.status === 'CONFIRMED').length,
            openComplaints: complaints.filter(c => c.status !== 'RESOLVED' && c.status !== 'CANCELLED').length,
            totalAssets: assets.length,
          }}
        />

        {/* Content Pane */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {activeTab === 'dashboard' && (
            <DashboardView
              onNavigate={setActiveTab}
              analyticsData={analyticsData}
              recentComplaints={complaints}
              recentEvents={analyticsData?.mongoActivity?.eventsByType ? [] : []}
              onTriggerWorker={handleTriggerWorker}
              isWorkerRunning={isWorkerRunning}
            />
          )}

          {activeTab === 'bookings' && (
            <BookingsView
              currentUser={currentUser}
              rooms={rooms}
              bookings={bookings}
              onRefreshBookings={fetchAllData}
            />
          )}

          {activeTab === 'complaints' && (
            <ComplaintsView
              currentUser={currentUser}
              complaints={complaints}
              assets={assets}
              staffList={staffList}
              onRefreshComplaints={fetchAllData}
            />
          )}

          {activeTab === 'buildings' && (
            <BuildingsRoomsView
              currentUser={currentUser}
              buildings={buildings}
              facilities={facilities}
              facilityUsages={facilityUsages}
              rooms={rooms}
              onRefreshData={fetchAllData}
            />
          )}

          {activeTab === 'assets' && (
            <AssetsView
              currentUser={currentUser}
              assets={assets}
              onRefreshAssets={fetchAllData}
            />
          )}

          {activeTab === 'staff' && (
            <StaffView
              currentUser={currentUser}
              staffList={staffList}
            />
          )}

          {activeTab === 'semantic_search' && <SemanticSearchView />}

          {activeTab === 'db_lab' && (
            <DatabaseLabView
              dbStatus={dbLabData?.dbStatus}
              mongoStatus={dbLabData?.mongoStatus}
              predefinedQueries={dbLabData?.queries || []}
            />
          )}

          {activeTab === 'docs' && <DocumentationView />}
        </main>
      </div>
    </div>
  );
}
