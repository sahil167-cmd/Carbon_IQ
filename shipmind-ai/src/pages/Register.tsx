import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiPost } from "../lib/api-client";

interface RegisterProps {
  isLoginInitial?: boolean;
}

export default function Register({ isLoginInitial = false }: RegisterProps) {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(isLoginInitial);
  const [form, setForm] = useState({
    name: "",
    orgName: "",
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    setIsLogin(isLoginInitial);
    setErrorMsg("");
  }, [isLoginInitial]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    try {
      if (isLogin) {
        // Real Login Call to Core API
        const data = await apiPost<{ accessToken: string; refreshToken?: string; user: any }>("/api/v1/auth/login", {
          email: form.email,
          password: form.password,
        });

        localStorage.setItem("access_token", data.accessToken);
        if (data.refreshToken) {
          localStorage.setItem("refresh_token", data.refreshToken);
        }
        localStorage.setItem("user", JSON.stringify(data.user));
        setDone(true);
        setTimeout(() => {
          navigate("/app/dashboard");
        }, 1000);
      } else {
        // Real Signup Call to Core API
        const data = await apiPost<{ accessToken: string; refreshToken?: string; user: any }>("/api/v1/auth/signup", {
          email: form.email,
          password: form.password,
          fullName: form.name,
          orgName: form.orgName.trim() || `${form.name}'s Organization`,
        });

        localStorage.setItem("access_token", data.accessToken);
        if (data.refreshToken) {
          localStorage.setItem("refresh_token", data.refreshToken);
        }
        localStorage.setItem("user", JSON.stringify(data.user));
        setDone(true);
        setTimeout(() => {
          navigate("/app/dashboard");
        }, 1000);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Authentication failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-surface text-on-surface min-h-screen flex flex-col md:flex-row overflow-hidden">
      {/* Left: Brand panel */}
      <section className="relative w-full md:w-1/2 lg:w-[55%] min-h-[40vh] md:min-h-screen bg-primary flex flex-col justify-center items-center p-8 md:p-16 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-secondary/10 rounded-full blur-[120px]" />
          <div className="absolute bottom-[-5%] right-[-5%] w-[30%] h-[30%] bg-primary-fixed/5 rounded-full blur-[100px]" />
        </div>
        <div className="absolute top-8 left-8 md:top-12 md:left-12 z-20">
          <Link to="/" className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary-fixed" style={{ fontVariationSettings: "'FILL' 1" }}>
              cloud_done
            </span>
            CarbonIQ
          </Link>
        </div>
        <div className="relative z-10 max-w-xl flex flex-col gap-12 animate-slide-up">
          <div className="bg-white/5 border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl backdrop-blur-md">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-secondary-fixed animate-pulse" />
                <span className="text-[13px] text-white/60 tracking-widest uppercase">
                  CarbonIQ Backend Engine Connected
                </span>
              </div>
              <span className="text-[13px] text-secondary-fixed font-bold">100% Deterministic</span>
            </div>
            <div className="space-y-4">
              <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-secondary-fixed w-[100%] rounded-full" />
              </div>
            </div>
          </div>
          <div className="space-y-6">
            <p className="text-[32px] font-semibold leading-[1.2] text-white">
              Enterprise GHG Protocol & GLEC Shipment Intelligence Platform
            </p>
          </div>
        </div>
      </section>

      {/* Right: Form */}
      <section className="w-full md:w-1/2 lg:w-[45%] bg-surface flex flex-col justify-center items-center px-6 py-12 md:px-16">
        <div className="w-full max-w-md space-y-8 animate-slide-up">
          <div className="space-y-2">
            <h1 className="text-[40px] font-semibold leading-[1.2] tracking-[-0.03em] text-primary">
              {isLogin ? "Welcome back" : "Create your account"}
            </h1>
            <p className="text-[15px] text-on-surface-variant">
              {isLogin ? "Login to your CarbonIQ dashboard to manage emissions." : "Join enterprise teams calculating emissions with zero AI hallucination."}
            </p>
          </div>

          {errorMsg && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-600 rounded-xl text-sm font-medium">
              {errorMsg}
            </div>
          )}

          {done ? (
            <div className="p-8 bg-secondary/10 rounded-xl border border-secondary/20 text-center space-y-2">
              <span className="material-symbols-outlined text-secondary text-5xl" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
              <p className="text-2xl font-semibold text-primary">{isLogin ? "Logged in successfully!" : "Account created!"}</p>
              <p className="text-[15px] text-on-surface-variant">Redirecting to Dashboard...</p>
            </div>
          ) : (
            <form className="space-y-6" onSubmit={handleSubmit}>
              {!isLogin && (
                <>
                  <div className="space-y-2">
                    <label className="text-[13px] text-on-surface-variant" htmlFor="name">Full Name</label>
                    <input
                      id="name"
                      type="text"
                      placeholder="John Doe"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="w-full px-4 py-3 bg-white border border-outline-variant rounded-xl text-[15px] focus:outline-none focus:border-primary transition-all"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[13px] text-on-surface-variant" htmlFor="orgName">Organization / Company Name</label>
                    <input
                      id="orgName"
                      type="text"
                      placeholder="Acme Logistics Inc."
                      value={form.orgName}
                      onChange={(e) => setForm({ ...form, orgName: e.target.value })}
                      className="w-full px-4 py-3 bg-white border border-outline-variant rounded-xl text-[15px] focus:outline-none focus:border-primary transition-all"
                    />
                  </div>
                </>
              )}
              <div className="space-y-2">
                <label className="text-[13px] text-on-surface-variant" htmlFor="email">Work Email</label>
                <input
                  id="email"
                  type="email"
                  placeholder="john@company.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-4 py-3 bg-white border border-outline-variant rounded-xl text-[15px] focus:outline-none focus:border-primary transition-all"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-[13px] text-on-surface-variant" htmlFor="password">Password (10+ chars, upper, lower, number, symbol)</label>
                <input
                  id="password"
                  type="password"
                  placeholder="••••••••••••"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full px-4 py-3 bg-white border border-outline-variant rounded-xl text-[15px] focus:outline-none focus:border-primary transition-all"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-primary text-white font-semibold rounded-xl hover:bg-primary/90 transition-all flex justify-center items-center gap-2 shadow-lg shadow-primary/20 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Connecting to Core API...</span>
                  </>
                ) : (
                  <span>{isLogin ? "Sign In" : "Get Started Free"}</span>
                )}
              </button>
            </form>
          )}

          <div className="text-center">
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setErrorMsg("");
              }}
              className="text-[14px] text-primary font-medium hover:underline"
            >
              {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
