import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { HOST } from '../utils/constants';
import debounce from 'lodash.debounce';

const SiteDetailsPage = () => {
  const { siteId } = useParams();
  const navigate = useNavigate();
  const [site, setSite] = useState(null);
  const [admins, setAdmins] = useState([]);
  const [users, setUsers] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [activeTab, setActiveTab] = useState('attendance');

  // Date formatting utilities
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatTime = (timeString) => {
    if (!timeString) return 'N/A';
    return timeString;
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getSyncStatus = (lastSyncTimestamp) => {
    if (!lastSyncTimestamp) return 'idle';
    const date = new Date(lastSyncTimestamp);
    const now = new Date();
    const diffHours = Math.floor((now - date) / 3600000);

    if (diffHours < 1) return 'active';
    if (diffHours < 24) return 'idle';
    return 'failed';
  };

  // Status Badge Component
  const StatusBadge = ({ status }) => {
    const getStatusStyles = () => {
      switch (status?.toLowerCase()) {
        case 'active':
        case 'present':
          return 'bg-green-100 text-green-700 border-green-300 shadow-green-100';
        case 'idle':
          return 'bg-blue-100 text-blue-700 border-blue-300 shadow-blue-100';
        case 'failed':
        case 'absent':
          return 'bg-red-100 text-red-700 border-red-300 shadow-red-100';
        case 'late':
          return 'bg-yellow-100 text-yellow-700 border-yellow-300 shadow-yellow-100';
        default:
          return 'bg-gray-100 text-gray-700 border-gray-300';
      }
    };
    return (
      <span className={`px-3 py-1.5 rounded-full text-xs font-bold border shadow-sm ${getStatusStyles()} uppercase tracking-wide`}>
        {status || 'Unknown'}
      </span>
    );
  };

  // Loading Spinner Component
  const LoadingSpinner = ({ message = 'Loading...' }) => {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <div className="relative w-20 h-20">
          <div className="absolute top-0 left-0 w-full h-full border-4 border-blue-100 rounded-full animate-pulse"></div>
          <div className="absolute top-0 left-0 w-full h-full border-4 border-[#00416A] border-t-transparent rounded-full animate-spin"></div>
          <div
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-10 h-10 border-4 border-yellow-400 border-b-transparent rounded-full animate-spin"
            style={{ animationDirection: 'reverse', animationDuration: '0.8s' }}
          ></div>
        </div>
        <p className="mt-6 text-gray-600 font-semibold text-lg animate-pulse">
          {message}
        </p>
      </div>
    );
  };

  // Fetch site data
  const fetchSiteData = useCallback(async () => {
    try {
      setLoading(true);
      const [siteResponse, adminsResponse, usersResponse] = await Promise.all([
        axios.get(`${HOST}/api/master-admin/sites/${siteId}/details`, { withCredentials: true }),
        axios.get(`${HOST}/api/master-admin/sites/${siteId}/admins`, { withCredentials: true }),
        axios.get(`${HOST}/api/master-admin/sites/${siteId}/users`, { withCredentials: true })
      ]);
      console.log(siteResponse.data);
      setSite(siteResponse.data);
      setAdmins(adminsResponse.data.admins);
      setUsers(usersResponse.data.users);

      // Fetch attendance for last sync day only
      if (siteResponse.data.site.last_sync_timestamp) {
        const lastSyncDate = new Date(siteResponse.data.site.last_sync_timestamp).toISOString().split('T')[0];
        const attendanceResponse = await axios.get(
          `${HOST}/api/master-admin/sites/${siteId}/attendance?from=${lastSyncDate}&to=${lastSyncDate}`,
          { withCredentials: true }
        );
        setAttendance(attendanceResponse.data.attendance);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch site data');
      console.error('Error fetching site data:', err);
    } finally {
      setLoading(false);
    }
  }, [siteId]);

  // Debounced attendance fetch
  const debouncedFetchAttendance = useCallback(
    debounce(async (from, to) => {
      if (!from || !to) return;
      try {
        const response = await axios.get(
          `${HOST}/api/master-admin/sites/${siteId}/attendance?from=${from}&to=${to}`,
          { withCredentials: true }
        );
        setAttendance(response.data.attendance);
      } catch (err) {
        console.error('Error fetching attendance:', err);
        setError('Failed to fetch attendance for selected dates');
      }
    }, 500),
    [siteId]
  );

  // Handle date filter change
  const handleDateFilterChange = (e) => {
    const { name, value } = e.target;
    if (name === 'from') setDateFrom(value);
    if (name === 'to') setDateTo(value);

    if (dateFrom && dateTo) {
      debouncedFetchAttendance(dateFrom, dateTo);
    }
  };

  // Handle search change
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  // Memoized filtered data
  const filteredAttendance = useMemo(() => {
    return attendance.filter(record =>
      record.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.employee_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.department?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [attendance, searchTerm]);

  const filteredUsers = useMemo(() => {
    return users.filter(user =>
      user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.employee_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.department?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [users, searchTerm]);

  // Download Excel
  const downloadExcel = () => {
    const dataToExport = activeTab === 'attendance' ? filteredAttendance : filteredUsers;
    const sheetName = activeTab === 'attendance' ? 'Attendance' : 'Users';

    const worksheet = XLSX.utils.json_to_sheet(
      activeTab === 'attendance'
        ? dataToExport.map(record => ({
            'Employee ID': record.employee_id,
            'Name': record.name,
            'Department': record.department,
            'Designation': record.designation,
            'Date': formatDate(record.date),
            'Check-In': formatTime(record.check_in_time),
            'Check-Out': formatTime(record.check_out_time),
            'Status': record.status,
          }))
        : dataToExport.map(user => ({
            'Employee ID': user.employee_id,
            'Name': user.name,
            'Email': user.email,
            'Phone': user.phone,
            'Department': user.department,
            'Designation': user.designation,
            'Created At': formatDate(user.created_at),
          }))
    );
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    XLSX.writeFile(workbook, `${site?.site.site_name}_${sheetName}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  useEffect(() => {
    fetchSiteData();
    return () => {
      debouncedFetchAttendance.cancel();
    };
  }, [fetchSiteData, debouncedFetchAttendance]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/40 to-slate-100">
        <nav className="bg-gradient-to-r from-[#00416A] via-[#0064a2] to-[#003558] shadow-2xl sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <h1 className="text-2xl font-bold text-white">Site Details</h1>
          </div>
        </nav>
        <LoadingSpinner message="Loading site details..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/40 to-slate-100 flex items-center justify-center">
        <div className="bg-white rounded-3xl shadow-2xl p-10 max-w-md animate-shake">
          <div className="text-center">
            <svg className="w-20 h-20 text-red-500 mx-auto mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-red-600 mb-8 text-lg font-semibold">{error}</p>
            <button
              onClick={() => navigate('/masterDashboard')}
              className="px-8 py-4 bg-gradient-to-r from-[#00416A] to-[#0064a2] text-white rounded-xl font-semibold hover:shadow-xl transition-all"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!site) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/40 to-slate-100">
        <nav className="bg-gradient-to-r from-[#00416A] via-[#0064a2] to-[#003558] shadow-2xl sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <h1 className="text-2xl font-bold text-white">Site Details</h1>
          </div>
        </nav>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <div className="text-center py-20 bg-white rounded-3xl shadow-lg">
            <svg className="w-24 h-24 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <p className="text-gray-500 text-xl font-semibold mb-2">Site not found</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/40 to-slate-100">
      {/* Navbar */}
      <nav className="bg-gradient-to-r from-[#00416A] via-[#0064a2] to-[#003558] shadow-2xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/masterDashboard')}
              className="flex items-center space-x-2 px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all duration-200 font-semibold"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span>Back</span>
            </button>
            <div>
              <h1 className="text-2xl font-bold text-white">Site Details</h1>
              <p className="text-blue-200 text-sm font-medium">Comprehensive site analytics and management</p>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 animate-fadeIn">
        {/* Site Information Card */}
        <div className="bg-white rounded-3xl shadow-2xl p-8 mb-8 border border-gray-100 animate-slideUp">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-6 lg:space-y-0">
            <div className="flex items-start space-x-5">
              <div className="p-4 bg-gradient-to-br from-[#00416A] to-[#0064a2] rounded-2xl shadow-xl">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div>
                <h2 className="text-4xl font-bold text-[#00416A] mb-3">{site.site.site_name}</h2>
                <div className="flex flex-wrap items-center gap-4 text-gray-600">
                  <span className="flex items-center space-x-2 bg-blue-50 px-3 py-1 rounded-lg">
                    <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                    <span className="font-semibold text-sm">ID: {site.site.site_id}</span>
                  </span>
                  <span className="flex items-center space-x-2 bg-green-50 px-3 py-1 rounded-lg">
                    <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="font-semibold text-sm">{formatDateTime(site.site.last_sync_timestamp)}</span>
                  </span>
                </div>
              </div>
            </div>
            <StatusBadge status={getSyncStatus(site.site.last_sync_timestamp)} />
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-xl p-6 text-white animate-slideUp" style={{ animationDelay: '0.1s' }}>
            <div className="flex items-center justify-between mb-3">
              <svg className="w-8 h-8 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              <span className="text-3xl font-bold">{site.stats.total_users || 0}</span>
            </div>
            <p className="text-blue-100 font-semibold">Total Users</p>
          </div>
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl shadow-xl p-6 text-white animate-slideUp" style={{ animationDelay: '0.2s' }}>
            <div className="flex items-center justify-between mb-3">
              <svg className="w-8 h-8 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
              <span className="text-3xl font-bold">{admins.length || 0}</span>
            </div>
            <p className="text-green-100 font-semibold">Site Admins</p>
          </div>
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl shadow-xl p-6 text-white animate-slideUp" style={{ animationDelay: '0.3s' }}>
            <div className="flex items-center justify-between mb-3">
              <svg className="w-8 h-8 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="text-3xl font-bold">{site.stats.total_attendance || 0}</span>
            </div>
            <p className="text-purple-100 font-semibold">Attendance Records</p>
          </div>
        </div>

        {/* Admins Section */}
        <div className="bg-white rounded-3xl shadow-2xl mb-8 overflow-hidden border border-gray-100 animate-slideUp">
          <div className="bg-gradient-to-r from-[#00416A] to-[#0064a2] px-8 py-6">
            <div className="flex items-center space-x-3">
              <svg className="w-7 h-7 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              <h3 className="text-2xl font-bold text-white">Site Administrators</h3>
              <span className="px-4 py-1.5 bg-white/20 rounded-full text-white text-sm font-bold">{admins.length || 0}</span>
            </div>
          </div>
          <div className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {admins.map((admin, index) => (
                <div key={index} className="bg-gradient-to-br from-slate-50 to-blue-50 rounded-2xl p-6 border-2 border-gray-200 hover:border-blue-300 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                  <div className="flex items-center space-x-4 mb-4">
                    {admin.profilePhoto ? (
                      <img src={admin.profilePhoto} alt={admin.name} className="w-14 h-14 rounded-full object-cover ring-4 ring-white shadow-lg" />
                    ) : (
                      <div className="w-14 h-14 bg-gradient-to-br from-[#00416A] to-[#0064a2] rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg">
                        {admin.name?.charAt(0)}
                      </div>
                    )}
                    <div>
                      <h4 className="font-bold text-gray-900 text-lg">{admin.name}</h4>
                      <span className="text-xs text-gray-500 font-semibold bg-yellow-100 px-2 py-1 rounded">ADMIN</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center text-gray-600 text-sm">
                      <svg className="w-4 h-4 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      <span className="truncate font-medium">{admin.email}</span>
                    </div>
                    <div className="flex items-center text-gray-600 text-sm">
                      <svg className="w-4 h-4 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      <span className="font-medium">{admin.phone}</span>
                    </div>
                    {admin.department && (
                      <div className="flex items-center text-gray-600 text-sm">
                        <svg className="w-4 h-4 mr-2 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                        <span className="font-medium">{admin.department}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Data Section with Tabs */}
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100 animate-slideUp">
          <div className="bg-gradient-to-r from-[#00416A] to-[#0064a2] px-8 py-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
              <div className="flex items-center space-x-6">
                <button
                  onClick={() => setActiveTab('attendance')}
                  className={`flex items-center space-x-2 px-5 py-2.5 rounded-xl font-bold transition-all ${
                    activeTab === 'attendance'
                      ? 'bg-white text-[#00416A] shadow-xl'
                      : 'text-white hover:bg-white/10'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <span>Attendance</span>
                  <span className="px-2 py-0.5 bg-yellow-400 text-[#00416A] rounded-full text-xs font-bold">{filteredAttendance.length}</span>
                </button>
                <button
                  onClick={() => setActiveTab('users')}
                  className={`flex items-center space-x-2 px-5 py-2.5 rounded-xl font-bold transition-all ${
                    activeTab === 'users'
                      ? 'bg-white text-[#00416A] shadow-xl'
                      : 'text-white hover:bg-white/10'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <span>All Users</span>
                  <span className="px-2 py-0.5 bg-yellow-400 text-[#00416A] rounded-full text-xs font-bold">{filteredUsers.length}</span>
                </button>
              </div>
              <button
                onClick={downloadExcel}
                className="flex items-center space-x-2 px-6 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-xl transition-all duration-200 shadow-xl font-semibold"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>Download Excel</span>
              </button>
            </div>
          </div>
          <div className="p-8">
            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-8">
              <div className="md:col-span-5">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-[#00416A]/20 focus:border-[#00416A] transition-all duration-200 outline-none font-medium"
                    placeholder="Search by name, ID, or department..."
                    value={searchTerm}
                    onChange={handleSearchChange}
                  />
                </div>
              </div>
              {activeTab === 'attendance' && (
                <>
                  <div className="md:col-span-3">
                    <input
                      type="date"
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-[#00416A]/20 focus:border-[#00416A] transition-all duration-200 outline-none font-medium"
                      value={dateFrom}
                      onChange={handleDateFilterChange}
                      name="from"
                    />
                  </div>
                  <div className="md:col-span-3">
                    <input
                      type="date"
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-[#00416A]/20 focus:border-[#00416A] transition-all duration-200 outline-none font-medium"
                      value={dateTo}
                      onChange={handleDateFilterChange}
                      name="to"
                    />
                  </div>
                  <div className="md:col-span-1">
                    <button
                      onClick={() => debouncedFetchAttendance(dateFrom, dateTo)}
                      className="w-full h-full bg-gradient-to-r from-[#00416A] to-[#0064a2] hover:from-[#003558] hover:to-[#00416A] text-white rounded-xl font-bold transition-all duration-200 shadow-lg hover:shadow-xl"
                    >
                      Apply
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Attendance Table */}
            {activeTab === 'attendance' && (
              <div className="overflow-x-auto rounded-2xl border-2 border-gray-200 shadow-lg">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-slate-100 to-blue-100 sticky top-0 z-10">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Photo</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Employee ID</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Name</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Department</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Designation</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Check-In</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Check-Out</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredAttendance.map((record, index) => (
                      <tr key={index} className="hover:bg-blue-50 transition-colors duration-150 group">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <img
                            src={record.profile_photo || 'https://png.pngtree.com/png-vector/20221023/ourlarge/pngtree-employee-employee-person-business-vector-png-image_34368596.png'}
                            alt={record.name}
                            className="w-12 h-12 rounded-full object-cover ring-2 ring-gray-300 group-hover:ring-blue-400 transition-all shadow-md"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-bold text-gray-900 bg-gray-100 px-3 py-1 rounded-lg">{record.employee_id}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-bold text-[#00416A]">{record.name}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-700 font-medium">{record.department}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-600">{record.designation}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-700 font-semibold">{formatDate(record.date)}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center text-sm text-gray-700 font-medium">
                            <svg className="w-4 h-4 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                            </svg>
                            {formatTime(record.check_in_time)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center text-sm text-gray-700 font-medium">
                            <svg className="w-4 h-4 mr-2 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                            {formatTime(record.check_out_time)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <StatusBadge status={record.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredAttendance.length === 0 && (
                  <div className="text-center py-20 bg-gray-50">
                    <svg className="w-24 h-24 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-gray-500 text-lg font-semibold mb-2">No attendance records found</p>
                    <p className="text-gray-400 text-sm">Try adjusting your search or date filters</p>
                  </div>
                )}
              </div>
            )}

            {/* Users Table */}
            {activeTab === 'users' && (
              <div className="overflow-x-auto rounded-2xl border-2 border-gray-200 shadow-lg">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-slate-100 to-blue-100 sticky top-0 z-10">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Photo</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Employee ID</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Name</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Email</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Phone</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Department</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Designation</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Created</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredUsers.map((user, index) => (
                      <tr key={index} className="hover:bg-blue-50 transition-colors duration-150 group">
                        <td className="px-6 py-4 whitespace-nowrap">
                          {user.profilePhoto ? (
                            <img
                              src={user.profilePhoto}
                              alt={user.name}
                              className="w-12 h-12 rounded-full object-cover ring-2 ring-gray-300 group-hover:ring-blue-400 transition-all shadow-md"
                            />
                          ) : (
                            <div className="w-12 h-12 bg-gradient-to-br from-[#00416A] to-[#0064a2] rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md">
                              {user.name?.charAt(0)}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-bold text-gray-900 bg-gray-100 px-3 py-1 rounded-lg">{user.employee_id}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-bold text-[#00416A]">{user.name}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-700 font-medium">{user.email}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-700 font-medium">{user.phone}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-700 font-medium">{user.department}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                            user.designation?.toLowerCase() === 'admin'
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}>
                            {user.designation}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-600">{formatDate(user.created_at)}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredUsers.length === 0 && (
                  <div className="text-center py-20 bg-gray-50">
                    <svg className="w-24 h-24 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <p className="text-gray-500 text-lg font-semibold mb-2">No users found</p>
                    <p className="text-gray-400 text-sm">Try adjusting your search criteria</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx="true">{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.6s ease-out;
        }
        .animate-slideUp {
          animation: slideUp 0.6s ease-out forwards;
          opacity: 0;
        }
        .animate-shake {
          animation: shake 0.4s ease-out;
        }
      `}</style>
    </div>
  );
};

export default SiteDetailsPage;
