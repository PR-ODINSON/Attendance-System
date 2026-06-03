import { useParams } from "react-router-dom";
import * as XLSX from 'xlsx';
import { useState } from "react";
import axios from "axios";
import { HOST } from "../utils/constants";

const UserExtractData = () => {
    const { employeeId } = useParams();
    const [loading, setLoading] = useState(false);

    const handleExtractData = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${HOST}/api/attendance/employee/${employeeId}`, {
                withCredentials: true,  // Enable cookie handling
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            const data = response.data;
            const workbook = XLSX.utils.book_new();
            const worksheet = XLSX.utils.json_to_sheet(data);
            XLSX.utils.book_append_sheet(workbook, worksheet, data.name);

            XLSX.writeFile(workbook, `${data[0].name}.xlsx`);
        } catch (error) {
            console.error('Error extracting data:', 
                error.response?.data?.error || error.message
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full bg-white p-6 rounded-xl shadow-md mt-6">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-[#00416A] montserrat">Export Attendance Data</h3>
                <button
                    onClick={handleExtractData}
                    className="px-6 py-2 bg-[#10B981] text-white rounded-lg hover:bg-[#059669] transition-colors font-semibold flex items-center gap-2"
                    disabled={loading}
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    {loading ? "Exporting..." : "Export as Excel"}
                </button>
            </div>
        </div>
    );
};

export default UserExtractData;