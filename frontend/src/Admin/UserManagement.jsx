import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { HOST } from "../utils/constants";
import { FiUserPlus, FiSearch, FiEdit2, FiTrash2 } from "react-icons/fi";
import ReactModal from "react-modal";

const UserManagement = () => {
  const [employees, setEmployees] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState(null);
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
        } else if (key !== "isAdmin") {
          formDataObj.append(key, formData[key]);
        }
      });

      if (isEditMode) {
        // Update employee
        if (isAdmin || selectedEmployee?.designation.toLowerCase() === "admin") {
          formDataObj.append("adminEmail", adminAuth.email);
          formDataObj.append("adminPassword", adminAuth.password);
        }

        await axios.put(
          `${HOST}/api/admin/update-employee/${selectedEmployee.employee_id}`,
          formDataObj,
          {
            withCredentials: true,
            headers: { "Content-Type": "multipart/form-data" },
          }
        );

        alert("Employee updated successfully!");
      } else {
        // Register new employee
        const employee_id = generateEmployeeId();
        formDataObj.append("employee_id", employee_id);

        if (isAdmin) {
          formDataObj.append("adminEmail", adminAuth.email);
          formDataObj.append("adminPassword", adminAuth.password);
        }

        await axios.post(`${HOST}/api/admin/register-by-admin`, formDataObj, {
          withCredentials: true,
          headers: { "Content-Type": "multipart/form-data" },
        });

        alert("Employee registered successfully!");
      }

      setIsOpen(false);
      fetchEmployees();
      resetForm();
    } catch (error) {
      console.log(error);
      alert(error.response?.data?.error || error.response?.data?.message || "Operation failed");
    }
  };

  const resetForm = () => {
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
    setIsEditMode(false);
    setSelectedEmployee(null);
    setShowAdminAuth(false);
  };

  const handleEditEmployee = (e, employee) => {
    e.stopPropagation();
    setSelectedEmployee(employee);
    setIsEditMode(true);
    setFormData({
      name: employee.name,
      email: employee.email,
      phone: employee.phone || "",
      department: employee.department,
      designation: employee.designation,
      password: "",
      profilePhotos: [],
      isAdmin: employee.designation.toLowerCase() === "admin",
    });
    if (employee.designation.toLowerCase() === "admin") {
      setShowAdminAuth(true);
    }
    setIsOpen(true);
  };

  const handleDeleteClick = (e, employee) => {
    e.stopPropagation();
    setEmployeeToDelete(employee);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      const isAdmin = employeeToDelete.designation.toLowerCase() === "admin";
      
      if (isAdmin) {
        if (!adminAuth.email || !adminAuth.password) {
          alert("Admin credentials required to delete admin users");
          return;
        }
      }

      await axios.delete(
        `${HOST}/api/admin/delete-employee/${employeeToDelete.employee_id}`,
        {
          withCredentials: true,
          data: {
            adminEmail: adminAuth.email || undefined,
            adminPassword: adminAuth.password || undefined,
          },
        }
      );

      alert("Employee deleted successfully!");
      setDeleteConfirmOpen(false);
      setEmployeeToDelete(null);
      setAdminAuth({ email: "", password: "" });
      fetchEmployees();
    } catch (error) {
      console.log(error);
      alert(error.response?.data?.error || error.response?.data?.message || "Delete failed");
    }
  };

  const openAddEmployeeModal = () => {
    resetForm();
    setIsOpen(true);
  };

  return (
    <div className="w-full flex justify-end items-start openSans">
      <div className="w-5/6 min-h-screen flex flex-col p-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-bold text-[#00416A] montserrat">
            Employee Management 
            <span className="ml-2 text-lg font-medium text-gray-500 align-middle">
              ({employees.length})
            </span>
          </h2>
          <button
            onClick={openAddEmployeeModal}
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
                className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow relative"
              >
                <div
                  onClick={() =>
                    navigate(`/userDashboard/${employee.employee_id}`)
                  }
                  className="cursor-pointer"
                >
                  <div className="flex items-center space-x-4">
                    <img
                      src={
                        employee.profilePhoto
                          ? `${HOST}/uploads/${encodeURIComponent(employee.name)}/${encodeURIComponent(employee.profilePhoto)}`
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

                {/* Action Buttons */}
                <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-200">
                  <button
                    onClick={(e) => handleEditEmployee(e, employee)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Edit Employee"
                  >
                    <FiEdit2 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={(e) => handleDeleteClick(e, employee)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete Employee"
                  >
                    <FiTrash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Register/Edit User Dialog */}
        <ReactModal
          isOpen={isOpen}
          onRequestClose={() => {
            setIsOpen(false);
            resetForm();
          }}
          contentLabel={isEditMode ? "Edit Employee" : "Register New Employee"}
          shouldCloseOnOverlayClick={false} // Prevent closing on overlay click
          className="max-w-2xl w-full bg-white p-8 rounded-xl shadow-xl mx-auto my-10 relative"
          overlayClassName="fixed inset-0 bg-white flex justify-center items-center z-50 overflow-y-auto"
        >
          <div className="relative">
            <h2 className="text-2xl font-bold text-[#00416A] mb-6 montserrat">
              {isEditMode ? "Edit Employee" : "Register New Employee"}
            </h2>

            <button
              onClick={() => {
                setIsOpen(false);
                resetForm();
              }}
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
                  Profile Photos {!isEditMode && <span className="text-red-500">*</span>}
                  {isEditMode && <span className="text-xs text-gray-500"> (Leave empty to keep existing)</span>}
                </label>
                <input
                  name="profilePhotos"
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFileChange}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00416A] focus:border-transparent"
                  required={!isEditMode}
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
                    Password {!isEditMode && <span className="text-red-500">*</span>}
                    {isEditMode && <span className="text-xs text-gray-500"> (Leave empty to keep existing)</span>}
                  </label>
                  <input
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00416A] focus:border-transparent"
                    required={!isEditMode}
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
                  onClick={() => {
                    setIsOpen(false);
                    resetForm();
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-[#00416A] text-white rounded-lg hover:bg-[#003151] transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#00416A]"
                >
                  {isEditMode ? "Update" : "Register"}
                </button>
              </div>
            </form>
          </div>
        </ReactModal>

        {/* Delete Confirmation Modal */}
        <ReactModal
          isOpen={deleteConfirmOpen}
          onRequestClose={() => setDeleteConfirmOpen(false)}
          contentLabel="Delete Employee"
          className="max-w-md w-full bg-white p-8 rounded-xl shadow-xl mx-auto my-10 relative"
          overlayClassName="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50"
        >
          <div>
            <h2 className="text-2xl font-bold text-red-600 mb-4">
              Delete Employee
            </h2>
            <p className="text-gray-700 mb-6">
              Are you sure you want to delete{" "}
              <span className="font-semibold">{employeeToDelete?.name}</span>?
              This action cannot be undone.
            </p>

            {employeeToDelete?.designation.toLowerCase() === "admin" && (
              <div className="space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200 mb-4">
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
                  />
                  <input
                    type="password"
                    placeholder="Admin Password"
                    value={adminAuth.password}
                    onChange={(e) =>
                      setAdminAuth({ ...adminAuth, password: e.target.value })
                    }
                    className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00416A] focus:border-transparent"
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setDeleteConfirmOpen(false);
                  setEmployeeToDelete(null);
                  setAdminAuth({ email: "", password: "" });
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </ReactModal>
      </div>
    </div>
  );
};

export default UserManagement;
