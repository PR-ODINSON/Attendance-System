import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { HOST } from "../utils/constants";
import Logo from "../assets/Logo/insolare-logo-image.png";

const MasterAdminDashboard = () => {
  const [sites, setSites] = useState([]);
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();

  // Date formatting utilities
  const formatDateTime = (dateString) => {
    if (!dateString) return "Never synced";
    const date = new Date(dateString);
    return date.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getRelativeTime = (dateString) => {
    if (!dateString) return "Never";
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? "s" : ""} ago`;
    if (diffHours < 24) return `${diffHours} hr${diffHours > 1 ? "s" : ""} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
    return formatDateTime(dateString);
  };

  const getSyncStatus = (lastSyncTimestamp) => {
    if (!lastSyncTimestamp) return "idle";
    const date = new Date(lastSyncTimestamp);
    const now = new Date();
    const diffHours = Math.floor((now - date) / 3600000);

    if (diffHours < 0.166) return "active";
    if (diffHours < 24) return "idle";
    return "failed";
  };

  // Status Badge Component
  const StatusBadge = ({ status }) => {
    const getStatusStyles = () => {
      switch (status?.toLowerCase()) {
        case "active":
          return "bg-green-100 text-green-700 border-green-300 shadow-green-100";
        case "idle":
          return "bg-blue-100 text-blue-700 border-blue-300 shadow-blue-100";
        case "failed":
          return "bg-red-100 text-red-700 border-red-300 shadow-red-100";
        default:
          return "bg-gray-100 text-gray-700 border-gray-300";
      }
    };

    return (
      <span
        className={`px-3 py-1.5 rounded-full text-xs font-bold border shadow-sm ${getStatusStyles()} uppercase tracking-wide`}
      >
        {status || "Unknown"}
      </span>
    );
  };

  // Loading Spinner Component
  const LoadingSpinner = ({ message = "Loading..." }) => {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <div className="relative w-20 h-20">
          <div className="absolute top-0 left-0 w-full h-full border-4 border-blue-100 rounded-full animate-pulse"></div>
          <div className="absolute top-0 left-0 w-full h-full border-4 border-[#00416A] border-t-transparent rounded-full animate-spin"></div>
          <div
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-10 h-10 border-4 border-yellow-400 border-b-transparent rounded-full animate-spin"
            style={{ animationDirection: "reverse", animationDuration: "0.8s" }}
          ></div>
        </div>
        <p className="mt-6 text-gray-600 font-semibold text-lg animate-pulse">
          {message}
        </p>
      </div>
    );
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      const [sitesResponse, overviewResponse] = await Promise.all([
        axios.get(`${HOST}/api/master-admin/sites`, { withCredentials: true }),
        axios.get(`${HOST}/api/master-admin/overview`, {
          withCredentials: true,
        }),
      ]);

      setSites(sitesResponse.data.sites || []);
      setOverview(overviewResponse.data.overview || null);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to fetch data");
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredSites = sites.filter(
    (site) =>
      site.site_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      site.site_id?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleLogout = async () => {
    try {
      const response = await axios.post(
        `${HOST}/api/auth/logout`,
        {},
        {
          withCredentials: true,
        }
      );

      if (response.status === 200) {
        // Clear any client-side storage if needed
        localStorage.clear();
        sessionStorage.clear();

        // Navigate to login page
        navigate("/");
      }
    } catch (error) {
      console.error(
        "Error logging out:",
        error.response?.data || error.message
      );
      alert("Failed to logout. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/40 to-slate-100">
      {/* Top Navbar */}
      <nav className="bg-gradient-to-r from-[#00416A] via-[#0064a2] to-[#003558] shadow-2xl sticky top-0 z-50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4 animate-fadeIn">
              <div className="relative w-35 h-15 rounded-2xl overflow-hidden shadow-lg border border-white/20 bg-white/10 flex items-center justify-center transform hover:scale-110 transition-transform duration-300">
                <img
                  src={Logo}
                  alt="InSolare Logo"
                  className="w-30 h-10 object-contain drop-shadow-[0_0_6px_rgba(255,255,255,0.4)]"
                />
                <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/20 to-transparent rounded-2xl pointer-events-none"></div>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">
                  Master Dashboard
                </h1>
                <p className="text-blue-200 text-sm font-medium">
                  Global Site Management Portal
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right hidden md:block">
                <p className="text-white font-semibold">Master Admin</p>
                <p className="text-blue-300 text-xs">Full System Access</p>
              </div>
              <button className="px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all duration-200 border border-white/20 backdrop-blur-sm font-medium hover:shadow-lg"
              onClick={handleLogout}
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 animate-fadeIn">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-8 space-y-4 md:space-y-0">
          <div>
            <h2 className="text-4xl font-bold text-[#00416A] mb-2">
              All Sites Overview
            </h2>
            <p className="text-gray-600 text-lg">
              Monitor and manage all registered sites across the network
            </p>
          </div>
          <button
            onClick={fetchAllData}
            className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-[#00416A] to-[#0064a2] hover:from-[#003558] hover:to-[#00416A] text-white rounded-xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 font-semibold"
          >
            <svg
              className={`w-5 h-5 ${loading ? "animate-spin-slow" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            <span>Refresh Data</span>
          </button>
        </div>

        {/* Global Stats Overview */}
        {overview && (
          <div className="bg-gradient-to-br from-white to-blue-50/30 rounded-3xl shadow-xl p-8 mb-8 border border-blue-100 animate-slideUp">
            <h3 className="text-xl font-bold text-[#00416A] mb-6 flex items-center">
              <svg
                className="w-6 h-6 mr-2 text-yellow-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
              Global System Statistics
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="text-center p-4 bg-white rounded-2xl shadow-md hover:shadow-lg transition-shadow">
                <p className="text-gray-600 text-sm mb-2 font-medium">
                  Total Sites
                </p>
                <p className="text-3xl font-bold text-[#00416A]">
                  {overview.total_sites || 0}
                </p>
              </div>
              <div className="text-center p-4 bg-white rounded-2xl shadow-md hover:shadow-lg transition-shadow">
                <p className="text-gray-600 text-sm mb-2 font-medium">
                  Total Users
                </p>
                <p className="text-3xl font-bold text-blue-600">
                  {overview.total_users || 0}
                </p>
              </div>
              <div className="text-center p-4 bg-white rounded-2xl shadow-md hover:shadow-lg transition-shadow">
                <p className="text-gray-600 text-sm mb-2 font-medium">
                  Total Admins
                </p>
                <p className="text-3xl font-bold text-green-600">
                  {overview.total_admins || 0}
                </p>
              </div>
              <div className="text-center p-4 bg-white rounded-2xl shadow-md hover:shadow-lg transition-shadow">
                <p className="text-gray-600 text-sm mb-2 font-medium">
                  Attendance Records
                </p>
                <p className="text-3xl font-bold text-purple-600">
                  {overview.total_attendance || 0}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Sync Status Summary Cards */}
        {/* {console.log(summary) }
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-lg border border-green-100 overflow-hidden group hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 animate-slideUp" style={{ animationDelay: '0.1s' }}>
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-gradient-to-br from-green-400 to-green-600 rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <span className="px-3 py-1 bg-green-50 text-green-700 rounded-full text-xs font-bold">ACTIVE</span>
              </div>
              <h3 className="text-4xl font-bold text-gray-900 mb-1 group-hover:text-green-600 transition-colors">{summary.active}</h3>
              <p className="text-gray-600 text-sm font-medium">Active Sites</p>
            </div>
            <div className="h-1.5 bg-gradient-to-r from-green-400 to-green-600"></div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-blue-100 overflow-hidden group hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 animate-slideUp" style={{ animationDelay: '0.2s' }}>
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-bold">IDLE</span>
              </div>
              <h3 className="text-4xl font-bold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">{summary.idle}</h3>
              <p className="text-gray-600 text-sm font-medium">Idle Sites</p>
            </div>
            <div className="h-1.5 bg-gradient-to-r from-blue-400 to-blue-600"></div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-red-100 overflow-hidden group hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 animate-slideUp" style={{ animationDelay: '0.3s' }}>
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-gradient-to-br from-red-400 to-red-600 rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <span className="px-3 py-1 bg-red-50 text-red-700 rounded-full text-xs font-bold">FAILED</span>
              </div>
              <h3 className="text-4xl font-bold text-gray-900 mb-1 group-hover:text-red-600 transition-colors">{summary.failed}</h3>
              <p className="text-gray-600 text-sm font-medium">Failed Sites</p>
            </div>
            <div className="h-1.5 bg-gradient-to-r from-red-400 to-red-600"></div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-yellow-100 overflow-hidden group hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 animate-slideUp" style={{ animationDelay: '0.4s' }}>
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <span className="px-3 py-1 bg-yellow-50 text-yellow-700 rounded-full text-xs font-bold">TOTAL</span>
              </div>
              <h3 className="text-4xl font-bold text-gray-900 mb-1 group-hover:text-yellow-600 transition-colors">{summary.total}</h3>
              <p className="text-gray-600 text-sm font-medium">Total Sites</p>
            </div>
            <div className="h-1.5 bg-gradient-to-r from-yellow-400 to-yellow-600"></div>
          </div>
        </div> */}

        {/* Search Bar */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 border border-gray-100 animate-slideUp">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
              <svg
                className="w-6 h-6 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <input
              type="text"
              className="w-full pl-14 pr-6 py-4 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-[#00416A]/20 focus:border-[#00416A] transition-all duration-200 outline-none text-lg font-medium"
              placeholder="Search by site name or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute inset-y-0 right-0 pr-5 flex items-center text-gray-400 hover:text-gray-600"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-5 mb-8 flex items-center space-x-4 animate-shake">
            <div className="flex-shrink-0">
              <svg
                className="w-7 h-7 text-red-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <p className="text-red-700 font-semibold text-lg">{error}</p>
          </div>
        )}

        {/* Loading State */}
        {loading && <LoadingSpinner message="Fetching sites data..." />}

        {/* Sites Grid */}
        {!loading && !error && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredSites.map((site, index) => (
              <div
                key={site.site_id}
                className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100 overflow-hidden group cursor-pointer transform hover:-translate-y-2 animate-slideUp"
                style={{ animationDelay: `${index * 0.05}s` }}
                onClick={() =>
                  navigate(`/masterDashboard/sites/${site.site_id}`)
                }
              >
                <div className="p-6">
                  <div className="flex justify-between items-start mb-5">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-[#00416A] mb-2 group-hover:text-[#0064a2] transition-colors line-clamp-1">
                        {site.site_name}
                      </h3>
                      <p className="text-gray-500 text-sm font-medium">
                        ID: {site.site_id}
                      </p>
                    </div>
                    <StatusBadge
                      status={getSyncStatus(site.last_sync_timestamp)}
                    />
                  </div>

                  <div className="space-y-3 mb-6">
                    <div className="flex items-center text-gray-600 text-sm">
                      <svg
                        className="w-4 h-4 mr-2 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <span className="font-semibold mr-1">Last Sync:</span>
                      <span>{getRelativeTime(site.last_sync_timestamp)}</span>
                    </div>
                    <div className="flex items-center text-gray-600 text-sm">
                      <svg
                        className="w-4 h-4 mr-2 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                        />
                      </svg>
                      <span className="font-semibold mr-1">Users:</span>
                      <span>
                        {site.total_users || 0} ({site.total_admins || 0}{" "}
                        admins)
                      </span>
                    </div>
                  </div>

                  <button className="w-full bg-gradient-to-r from-[#00416A] to-[#0064a2] hover:from-[#003558] hover:to-[#00416A] text-white py-3.5 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center space-x-2 group-hover:shadow-xl transform group-hover:scale-[1.02]">
                    <span>View Details</span>
                    <svg
                      className="w-5 h-5 group-hover:translate-x-1 transition-transform"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 7l5 5m0 0l-5 5m5-5H6"
                      />
                    </svg>
                  </button>
                </div>
                <div className="h-1.5 bg-gradient-to-r from-[#00416A] via-yellow-400 to-[#0064a2] transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left"></div>
              </div>
            ))}
          </div>
        )}

        {/* No Sites Found */}
        {!loading && !error && filteredSites.length === 0 && (
          <div className="text-center py-20 bg-white rounded-3xl shadow-lg animate-slideUp">
            <svg
              className="w-32 h-32 mx-auto text-gray-300 mb-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
              />
            </svg>
            <p className="text-gray-500 text-xl font-semibold mb-2">
              No sites found
            </p>
            <p className="text-gray-400">Try adjusting your search criteria</p>
          </div>
        )}
      </div>

      <style jsx="true">{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
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
          0%,
          100% {
            transform: translateX(0);
          }
          25% {
            transform: translateX(-5px);
          }
          75% {
            transform: translateX(5px);
          }
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
        .animate-spin-slow {
          animation: spin 3s linear infinite;
        }
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
};

export default MasterAdminDashboard;
