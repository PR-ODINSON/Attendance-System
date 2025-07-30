import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { HOST } from "../utils/constants";
import InSolareLogo from "../assets/Logo/insolare-logo-image.png";

const SignIn = () => {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData((prevState) => ({
      ...prevState,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await axios.post(`${HOST}/api/auth/login`, formData, {
        withCredentials: true,
        headers: { "Content-Type": "application/json" },
      });
      const data = response.data;
      localStorage.setItem("email", formData.email);
      navigate(data.designation.toLowerCase() === "admin" ? "/records" : "/dashboard");
    } catch (error) {
      alert(error.response?.data?.error || "Login failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-10 w-72 h-72 bg-gradient-to-r from-yellow-400/20 to-blue-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-10 w-96 h-96 bg-gradient-to-r from-blue-600/20 to-yellow-300/20 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.02)_1px,transparent_1px)] bg-[size:50px_50px]" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col lg:flex-row min-h-screen">
        {/* Left Side - Hero */}
        <div className="lg:w-2/3 p-12 flex items-center justify-center text-white">
          <div className="max-w-2xl text-center space-y-8">
            <div className="relative w-32 h-32 mx-auto">
              <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-blue-500 blur-2xl rounded-full opacity-30 animate-pulse"></div>
              <div className="relative z-10 w-full h-full bg-white/10 backdrop-blur-xl rounded-3xl p-2">
                <img src={InSolareLogo} alt="Logo" className="w-full h-full object-contain" />
              </div>
            </div>

            <h1 className="text-5xl font-bold bg-gradient-to-r from-white via-blue-300 to-yellow-300 bg-clip-text text-transparent leading-snug">
              InSolare Attendance System
            </h1>

            <p className="text-lg text-blue-100/90">
              Streamlining attendance at renewable energy sites with{" "}
              <span className="text-yellow-300 font-semibold">face recognition</span> powered by AI.
            </p>

            <div className="grid sm:grid-cols-3 gap-4 pt-6">
              {[
                { emoji: "🤖", title: "AI-Powered", desc: "Smart face detection" },
                { emoji: "⚡", title: "Real-time", desc: "Live attendance logs" },
                { emoji: "🌞", title: "Solar Ready", desc: "Built for field teams" },
              ].map(({ emoji, title, desc }, i) => (
                <div
                  key={i}
                  className="p-4 rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm text-left hover:bg-white/10 transition transform hover:scale-105"
                >
                  <div className="text-2xl">{emoji}</div>
                  <h4 className="font-semibold text-white">{title}</h4>
                  <p className="text-sm text-blue-100/80">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side - Form */}
        <div className="lg:w-1/3 p-10 flex items-center justify-center">
          <div className="w-full max-w-sm relative z-10 bg-white/10 backdrop-blur-xl p-8 rounded-3xl border border-white/20 shadow-xl">
            <h2 className="text-white text-2xl font-bold text-center mb-6">Sign In</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-blue-100 mb-1">Email</label>
                <input
                  type="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-lg bg-white/10 text-white placeholder-white/50 border border-white/20 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label className="block text-blue-100 mb-1">Password</label>
                <input
                  type="password"
                  name="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-lg bg-white/10 text-white placeholder-white/50 border border-white/20 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  placeholder="********"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-yellow-400 to-yellow-500 text-slate-900 font-semibold py-3 rounded-lg transition hover:from-yellow-300 hover:to-yellow-400 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isLoading ? "Signing In..." : "Sign In"}
              </button>
            </form>

            <div className="mt-6 text-center text-blue-100/80 text-sm">
              Powered by <span className="text-yellow-400 font-medium">AI</span>.
            </div>
          </div>
        </div>
      </div>

      {/* Particles */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(30)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white/20 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 4}s`,
              animation: `float ${3 + Math.random() * 2}s ease-in-out infinite alternate`,
            }}
          ></div>
        ))}
      </div>

      {/* Custom Animations */}
      <style jsx>{`
        @keyframes float {
          from {
            transform: translateY(0px);
          }
          to {
            transform: translateY(-20px);
          }
        }
      `}</style>
    </div>
  );
};

export default SignIn;
