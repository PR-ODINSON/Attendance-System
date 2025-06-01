import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { HOST } from "../utils/constants";

const SignIn = () => {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData((prevState) => ({
      ...prevState,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(`${HOST}/api/auth/login`, formData, {
        withCredentials: true, // This allows the browser to handle cookies
        headers: {
          "Content-Type": "application/json",
        },
      });
      console.log("Login successful:", response.data);
      const data = response.data;

      // Store email in localStorage for future use
      localStorage.setItem("email", formData.email);

      // Navigate based on user role
      if (data.designation.toLowerCase() === "admin") {
        navigate("/records");
      } else {
        navigate("/dashboard");
      }
    } catch (error) {
      console.error("Error:", error.response?.data?.error);
      alert(
        error.response?.data?.error || "An error occurred. Please try again."
      );
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f4f4] flex items-center justify-center">
      <div className="bg-white shadow-lg rounded-lg mx-4 p-6 w-full max-w-lg">
        <h1 className="text-2xl montserrat font-bold text-center text-[#0064a2] mb-6">
          Sign In
        </h1>
        <form
          onSubmit={handleSubmit}
          className="w-full flex flex-col gap-4 openSans"
        >
          <div className="w-full flex flex-col mobile:text-sm">
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Enter email address"
              required
              className="w-full border border-gray-300 rounded-md p-2 focus:ring-[#00416A] focus:border-[#00416A]"
            />
          </div>

          <div className="flex flex-col w-full mobile:text-sm">
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter password"
              required
              className="w-full border border-gray-300 rounded-md p-2 focus:ring-[#00416A] focus:border-[#00416A]"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-[#0064a2] text-white rounded-md py-2 hover:bg-[#00416A] transition cursor-pointer"
          >
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
};

export default SignIn;
