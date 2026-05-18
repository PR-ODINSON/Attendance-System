import React, { useState } from "react";
import axios from "axios";
import { HOST } from "../utils/constants";

const ExpandableSessionDetails = ({ employeeId, date = null }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [sessions, setSessions] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedDate, setSelectedDate] = useState(
    date || new Date().toISOString().split("T")[0]
  );

  const fetchSessionDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(
        `${HOST}/api/attendance/session-details/${employeeId}`,
        {
          params: {
            date: selectedDate,
          },
          withCredentials: true,
        }
      );
      setSessions(response.data);
    } catch (err) {
      console.error("Error fetching session details:", err);
      setError("Failed to load session details");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleExpand = () => {
    if (!isExpanded) {
      fetchSessionDetails();
    }
    setIsExpanded(!isExpanded);
  };

  return (
    <div className="w-full px-12 py-6 bg-white rounded-xl shadow-md mt-6">
      <button
        onClick={handleToggleExpand}
        className="w-full flex items-center justify-between py-3 px-4 hover:bg-gray-50 rounded-lg transition-colors"
      >
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-bold text-[#00416A] montserrat">
            Detailed Sessions
          </h3>
          {sessions && (
            <>
              <span className="text-sm bg-[#0064a2] text-white px-3 py-1 rounded-full font-semibold">
                {sessions.total_sessions} in
              </span>
              <span className="text-sm bg-[#FFA726] text-white px-3 py-1 rounded-full font-semibold">
                {sessions.times_exited} out
              </span>
            </>
          )}
        </div>
        <div
          className={`text-2xl transition-transform ${
            isExpanded ? "rotate-180" : ""
          }`}
        >
          v
        </div>
      </button>

      {isExpanded && (
        <div className="mt-4 border-t pt-4">
          <div className="mb-4">
            <label className="text-sm font-semibold text-[#00416A] montserrat">
              Select Date:
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                setSessions(null);
              }}
              className="mt-2 px-3 py-2 border border-gray-300 rounded-lg w-full focus:outline-none focus:border-[#0064a2]"
            />
          </div>

          {!sessions && !loading && (
            <button
              onClick={fetchSessionDetails}
              className="px-4 py-2 bg-[#0064a2] text-white rounded-lg hover:bg-[#00416A] transition-colors font-semibold mb-4"
            >
              Load Sessions
            </button>
          )}

          {loading && (
            <div className="text-center py-6 text-gray-500">
              Loading sessions...
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-100 text-red-700 rounded-md mb-4">
              {error}
            </div>
          )}

          {sessions && !loading && (
            <div className="overflow-x-auto">
              {sessions.total_sessions === 0 ? (
                <p className="text-center py-4 text-gray-500">
                  No sessions recorded for {selectedDate}
                </p>
              ) : (
                <>
                  {/* Summary bar */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                    <div className="bg-[#EEF6FF] border border-[#0064a2] rounded-lg p-3 text-center">
                      <p className="text-xs font-semibold text-[#0064a2] uppercase tracking-wide">
                        Times Entered
                      </p>
                      <p className="text-2xl font-bold text-[#00416A] mt-1">
                        {sessions.total_sessions}
                      </p>
                    </div>
                    <div className="bg-[#F3E8FF] border border-[#7B1FA2] rounded-lg p-3 text-center">
                      <p className="text-xs font-semibold text-[#7B1FA2] uppercase tracking-wide">
                        Times Exited
                      </p>
                      <p className="text-2xl font-bold text-[#4A148C] mt-1">
                        {sessions.times_exited}
                      </p>
                    </div>
                    <div className="bg-[#E8F5E9] border border-[#4CAF50] rounded-lg p-3 text-center">
                      <p className="text-xs font-semibold text-[#2E7D32] uppercase tracking-wide">
                        Total Inside
                      </p>
                      <p className="text-2xl font-bold text-[#2E7D32] mt-1">
                        {sessions.total_in_duration_formatted}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {sessions.total_in_duration_minutes} min
                      </p>
                    </div>
                    <div className="bg-[#FFF3E0] border border-[#FFA726] rounded-lg p-3 text-center">
                      <p className="text-xs font-semibold text-[#E65100] uppercase tracking-wide">
                        Total Outside
                      </p>
                      <p className="text-2xl font-bold text-[#E65100] mt-1">
                        {sessions.total_out_duration_formatted}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {sessions.total_out_duration_minutes} min
                      </p>
                    </div>
                  </div>

                  {/* Timeline table interleaving inside sessions and outside gaps */}
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-[#00416A] text-white">
                        <th className="px-4 py-3 text-left font-semibold">#</th>
                        <th className="px-4 py-3 text-left font-semibold">Type</th>
                        <th className="px-4 py-3 text-left font-semibold">From</th>
                        <th className="px-4 py-3 text-left font-semibold">To</th>
                        <th className="px-4 py-3 text-left font-semibold">Duration</th>
                        <th className="px-4 py-3 text-left font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sessions.sessions.map((session, idx) => {
                        const gap = sessions.out_gaps?.find(
                          (g) => g.after_session === session.sequence
                        );
                        return (
                          <React.Fragment key={session.id || idx}>
                            {/* Inside session row */}
                            <tr className="bg-[#EEF6FF] border-b border-blue-100 hover:bg-[#dceeff] transition-colors">
                              <td className="px-4 py-3 font-bold text-[#00416A]">
                                {session.sequence}
                              </td>
                              <td className="px-4 py-3">
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-[#0064a2] text-white text-xs font-semibold">
                                  ↓ Inside
                                </span>
                              </td>
                              <td className="px-4 py-3 font-mono text-[#0064a2]">
                                {session.check_in}
                              </td>
                              <td className="px-4 py-3 font-mono text-[#0064a2]">
                                {session.check_out || "—"}
                              </td>
                              <td className="px-4 py-3 font-semibold text-[#00416A]">
                                {session.duration_formatted}
                              </td>
                              <td className="px-4 py-3">
                                <span
                                  className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                    session.status === "Completed"
                                      ? "bg-green-100 text-green-800"
                                      : "bg-yellow-100 text-yellow-800"
                                  }`}
                                >
                                  {session.status}
                                </span>
                              </td>
                            </tr>

                            {/* Outside gap row (if this session has a gap after it) */}
                            {gap && (
                              <tr className="bg-[#FFF8EC] border-b border-orange-100 hover:bg-[#ffe9c0] transition-colors">
                                <td className="px-4 py-3 text-gray-400 text-xs italic pl-7">
                                  gap
                                </td>
                                <td className="px-4 py-3">
                                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-[#FFA726] text-white text-xs font-semibold">
                                    ↑ Outside
                                  </span>
                                </td>
                                <td className="px-4 py-3 font-mono text-[#E65100]">
                                  {gap.time_out}
                                </td>
                                <td className="px-4 py-3 font-mono text-[#E65100]">
                                  {gap.time_in}
                                </td>
                                <td className="px-4 py-3 font-semibold text-[#E65100]">
                                  {gap.duration_formatted}
                                </td>
                                <td className="px-4 py-3">
                                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-800">
                                    Returned
                                  </span>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ExpandableSessionDetails;
