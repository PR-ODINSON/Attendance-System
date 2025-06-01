import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { HOST } from "../utils/constants";
import { FiUserPlus, FiSearch } from "react-icons/fi";
import ReactModal from "react-modal";

const UserManagement = () => {
  const [employees, setEmployees] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  ReactModal.setAppElement("#root");

  // Form states
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    department: "",
    designation: "",
    password: "",
    profilePhotos: [],
    isAdmin: false,
  });
  const [adminAuth, setAdminAuth] = useState({
    email: "",
    password: "",
  });
  const [showAdminAuth, setShowAdminAuth] = useState(false);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const response = await axios.get(`${HOST}/api/admin/get-all-employees`, {
        withCredentials: true,
      });

      // Sort employees: admins first, then others
      const sortedEmployees = response.data.sort((a, b) => {
        const aIsAdmin = a.designation.toLowerCase() === "admin";
        const bIsAdmin = b.designation.toLowerCase() === "admin";
        return bIsAdmin - aIsAdmin;
      });

      setEmployees(sortedEmployees);
    } catch (error) {
      setError(error.response?.data?.message || "Failed to fetch employees");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (event) => {
    setSearchQuery(event.target.value);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevState) => ({
      ...prevState,
      [name]: value,
    }));
  };

  const generateEmployeeId = () => {
    return `EMP-${Date.now()}`;
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      setFormData((prevState) => ({
        ...prevState,
        profilePhotos: files,
      }));
    }
  };

  const filteredEmployees = employees.filter(
    (employee) =>
      employee.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      employee.employee_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      employee.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
      employee.designation.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSubmit = async (e) => {
    const employee_id = generateEmployeeId();
    e.preventDefault();
    try {
      const isAdmin = formData.designation.toLowerCase() === "admin";

      if (isAdmin && (!adminAuth.email || !adminAuth.password)) {
        setShowAdminAuth(true);
        return;
      }

      const formDataObj = new FormData();

      Object.keys(formData).forEach((key) => {
        if (key === "profilePhotos") {
          // Handle files properly
          Array.from(formData.profilePhotos).forEach((file) => {
            formDataObj.append("profilePhotos", file);
          });
        } else {
          formDataObj.append(key, formData[key]);
        }
      });
      formDataObj.append("employee_id", employee_id);

      if (isAdmin) {
        formDataObj.append("adminEmail", adminAuth.email);
        formDataObj.append("adminPassword", adminAuth.password);
      }

      console.log("Files being sent:", formData.profilePhotos);

      await axios.post(`${HOST}/api/admin/register-by-admin`, formDataObj, {
        withCredentials: true,
        headers: { "Content-Type": "multipart/form-data" },
      });

      setIsOpen(false);
      fetchEmployees();
      setFormData({
        name: "",
        email: "",
        phone: "",
        department: "",
        designation: "",
        password: "",
        profilePhotos: [],
        isAdmin: false,
      });
      setAdminAuth({
        email: "",
        password: "",
      });
    } catch (error) {
      console.log(error);
      alert(error.response?.data?.message || "Registration failed");
    }
  };

  return (
    <div className="w-full flex justify-end items-start openSans">
      <div className="w-5/6 min-h-screen flex flex-col p-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-bold text-[#00416A] montserrat">
            Employee Management
          </h2>
          <button
            onClick={() => setIsOpen(true)}
            className="flex items-center px-4 py-2 bg-[#00416A] text-white rounded-lg hover:bg-[#003151] transition-colors"
          >
            <FiUserPlus className="mr-2" />
            Add Employee
          </button>
        </div>

        <div className="relative mb-6">
          <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search employees..."
            value={searchQuery}
            onChange={handleSearch}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#00416A]"
          />
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#00416A]"></div>
          </div>
        ) : error ? (
          <div className="text-red-500 text-center">{error}</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEmployees.map((employee) => (
              <div
                key={employee.employee_id}
                onClick={() =>
                  navigate(`/userDashboard/${employee.employee_id}`)
                }
                className="bg-white rounded-xl shadow-lg p-6 cursor-pointer hover:shadow-xl transition-shadow"
              >
                <div className="flex items-center space-x-4">
                  <img
                    src={
                      employee.profilePhoto
                        ? `/uploads/${employee.profilePhoto}`
                        : "https://via.placeholder.com/100"
                    }
                    alt={employee.name}
                    className="w-16 h-16 rounded-full object-cover"
                  />
                  <div>
                    <h3 className="font-semibold text-lg">{employee.name}</h3>
                    <p className="text-sm text-gray-600">
                      ID: {employee.employee_id}
                    </p>
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  <p className="text-sm">
                    <span className="font-medium">Department:</span>{" "}
                    {employee.department}
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">Designation:</span>{" "}
                    <span
                      className={
                        employee.designation.toLowerCase() === "admin"
                          ? "text-[#00416A] font-semibold"
                          : ""
                      }
                    >
                      {employee.designation}
                    </span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Register User Dialog */}
        <ReactModal
          isOpen={isOpen}
          onRequestClose={() => setIsOpen(false)}
          contentLabel="Register New Employee"
          shouldCloseOnOverlayClick={false} // Prevent closing on overlay click
          className="max-w-2xl w-full bg-white p-8 rounded-xl shadow-xl mx-auto my-10 relative"
          overlayClassName="fixed inset-0 bg-white flex justify-center items-center z-50 overflow-y-auto"
        >
          <div className="relative">
            <h2 className="text-2xl font-bold text-[#00416A] mb-6 montserrat">
              Register New Employee
            </h2>

            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-0 right-0 text-gray-500 hover:text-gray-700"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Profile Photos */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Profile Photos <span className="text-red-500">*</span>
                </label>
                <input
                  name="profilePhotos"
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFileChange}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00416A] focus:border-transparent"
                  required
                />
                {formData.profilePhotos.length > 0 && (
                  <p className="text-sm text-green-600 mt-1">
                    {formData.profilePhotos.length} file(s) selected
                  </p>
                )}
              </div>

              {/* Name and Email */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    name="name"
                    type="text"
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00416A] focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00416A] focus:border-transparent"
                    required
                  />
                </div>
              </div>

              {/* Phone and Department */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00416A] focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Department <span className="text-red-500">*</span>
                  </label>
                  <input
                    name="department"
                    type="text"
                    value={formData.department}
                    onChange={handleChange}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00416A] focus:border-transparent"
                    required
                  />
                </div>
              </div>

              {/* Designation and Password */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Designation <span className="text-red-500">*</span>
                  </label>
                  <input
                    name="designation"
                    type="text"
                    value={formData.designation}
                    onChange={handleChange}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00416A] focus:border-transparent"
                    disabled={formData.isAdmin}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password <span className="text-red-500">*</span>
                  </label>
                  <input
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00416A] focus:border-transparent"
                    required
                  />
                </div>
              </div>

              {/* Admin Checkbox */}
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isAdmin"
                  checked={formData.isAdmin}
                  onChange={(e) => {
                    setFormData({
                      ...formData,
                      isAdmin: e.target.checked,
                      designation: e.target.checked
                        ? "admin"
                        : formData.designation,
                    });
                    if (e.target.checked) {
                      setShowAdminAuth(true);
                    } else {
                      setShowAdminAuth(false);
                    }
                  }}
                  className="w-4 h-4 text-[#00416A] border-gray-300 rounded focus:ring-[#00416A]"
                />
                <label
                  htmlFor="isAdmin"
                  className="text-sm font-medium text-gray-700"
                >
                  Make Admin
                </label>
              </div>

              {/* Admin Authentication Section */}
              {showAdminAuth && formData.isAdmin && (
                <div className="space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <h4 className="font-medium text-[#00416A]">
                    Admin Authentication Required
                  </h4>
                  <div className="space-y-3">
                    <input
                      type="email"
                      placeholder="Admin Email"
                      value={adminAuth.email}
                      onChange={(e) =>
                        setAdminAuth({ ...adminAuth, email: e.target.value })
                      }
                      className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00416A] focus:border-transparent"
                      required={formData.isAdmin}
                    />
                    <input
                      type="password"
                      placeholder="Admin Password"
                      value={adminAuth.password}
                      onChange={(e) =>
                        setAdminAuth({ ...adminAuth, password: e.target.value })
                      }
                      className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00416A] focus:border-transparent"
                      required={formData.isAdmin}
                    />
                  </div>
                </div>
              )}

              {/* Form Buttons */}
              <div className="flex justify-end space-x-3 mt-6 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-[#00416A] text-white rounded-lg hover:bg-[#003151] transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#00416A]"
                >
                  Register
                </button>
              </div>
            </form>
          </div>
        </ReactModal>
      </div>
    </div>
  );
};

export default UserManagement;
