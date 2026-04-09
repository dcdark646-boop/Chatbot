import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lock } from "lucide-react";
import { toast } from "sonner";

const Register = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const result = await register(email, password, name);
    setLoading(false);

    if (result.success) {
      toast.success("Account created successfully!");
      navigate("/");
    } else {
      toast.error(result.error);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-950 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-600 mb-4">
            <Lock className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold font-['Outfit'] text-slate-100 mb-2">
            Create Account
          </h1>
          <p className="text-slate-400">Join our encrypted chat platform</p>
        </div>

        <div className="backdrop-blur-xl bg-slate-900/70 border border-slate-700/50 rounded-2xl p-8 shadow-[0_8px_32px_rgba(0,0,0,0.2)]">
          <form onSubmit={handleSubmit} className="space-y-6" data-testid="register-form">
            <div>
              <label className="text-sm font-medium text-slate-300 mb-2 block">
                Name
              </label>
              <Input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                required
                className="bg-slate-800 border-none focus-visible:ring-1 focus-visible:ring-emerald-500 text-slate-100"
                data-testid="register-name-input"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-300 mb-2 block">
                Email
              </label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                className="bg-slate-800 border-none focus-visible:ring-1 focus-visible:ring-emerald-500 text-slate-100"
                data-testid="register-email-input"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-300 mb-2 block">
                Password
              </label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="bg-slate-800 border-none focus-visible:ring-1 focus-visible:ring-emerald-500 text-slate-100"
                data-testid="register-password-input"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/20 font-medium rounded-lg py-3"
              data-testid="register-submit-button"
            >
              {loading ? "Creating account..." : "Sign Up"}
            </Button>
          </form>

          <p className="text-center text-slate-400 text-sm mt-6">
            Already have an account?{" "}
            <Link
              to="/login"
              className="text-emerald-400 hover:text-emerald-300 font-medium"
              data-testid="register-login-link"
            >
              Login
            </Link>
          </p>
        </div>

        <div className="mt-6 text-center text-xs text-slate-500 flex items-center justify-center gap-1">
          <Lock className="w-3 h-3" />
          <span>Messages are end-to-end encrypted</span>
        </div>
      </div>
    </div>
  );
};

export default Register;
