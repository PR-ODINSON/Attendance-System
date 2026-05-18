import React, { useState, useEffect } from "react";
import axios from "axios";
import { HOST } from "../utils/constants";

const SessionMetrics = ({ employeeId }) => {
  const [period, setPeriod] = useState("today");
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchMetrics();
  }, [period, employeeId]);

  const fetchMetrics = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(
        `${HOST}/api/attendance/session-statistics`,
        {
          params: {
            employeeId,
            period,
          },
          withCredentials: true,
        }
      );
      setMetrics(response.data);
    } catch (err) {
      console.error("Error fetching session metrics:", err);
      setError("Failed to load metrics");
    } finally {
      setLoading(false);
    }
  };

  if (!metrics) {
    return null;
  }

  return (
    <div className="w-full px-12 py-6 bg-white rounded-xl shadow-md">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-[#00416A] montserrat">
          Session Details
        </h2>
        <div className="flex gap-2">
          {["today", "month", "alltime"].map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-2 rounded-md font-semibold transition-all ${
                period === p
                  ? "bg-[#FFC107] text-[#00416A]"
                  : "bg-[#E0E0E0] text-[#666]"
              }`}
            >
              {p === "today" ? "Today" : p === "month" ? "This Month" : "All Time"}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
          {error}
        </div>
      )}

      {loading && (
        <div className="text-center py-8 text-gray-500">Loading metrics...</div>
      )}

      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gradient-to-br from-[#0064a2] to-[#00416A] text-white p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow">
            <div>
              <p className="text-sm font-semibold opacity-90">
                Total Sessions
              </p>
              <p className="text-4xl font-bold mt-2">
                {metrics.total_cycles}
              </p>
              <p className="text-xs mt-2 opacity-75">
                {metrics.completed_sessions} completed, {metrics.active_sessions} active
              </p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-[#4CAF50] to-[#2E7D32] text-white p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow">
            <div>
              <p className="text-sm font-semibold opacity-90">
                Avg Session Duration
              </p>
              <p className="text-4xl font-bold mt-2">
                {metrics.formatted.avg_session_duration}
              </p>
              <p className="text-xs mt-2 opacity-75">
                {metrics.avg_session_duration_minutes} minutes
              </p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-[#FFA726] to-[#E65100] text-white p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow">
            <div>
              <p className="text-sm font-semibold opacity-90">
                Total Time Inside
              </p>
              <p className="text-4xl font-bold mt-2">
                {metrics.formatted.total_time_inside}
              </p>
              <p className="text-xs mt-2 opacity-75">
                {metrics.total_time_inside_minutes} minutes
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SessionMetrics;
