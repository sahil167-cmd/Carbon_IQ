import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";

interface RegisterProps {
  isLoginInitial?: boolean;
}

export default function Register({ isLoginInitial = false }: RegisterProps) {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(isLoginInitial);
  const [form, setForm] = useState({
    name: "", email: "", size: "", password: "",
  });
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  // Sync state if path changes
  useEffect(() => {
    setIsLogin(isLoginInitial);
  }, [isLoginInitial]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setDone(true);
      // Wait 1 second after showing success and then redirect to dashboard
      setTimeout(() => {
        navigate("/app/dashboard");
      }, 1000);
    }, 1500);
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
            ShipMind AI
          </Link>
        </div>
        <div className="relative z-10 max-w-xl flex flex-col gap-12 animate-slide-up">
          <div className="bg-white/5 border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl backdrop-blur-md">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-secondary-fixed animate-pulse" />
                <span className="text-[13px] text-white/60 tracking-widest uppercase">
                  Live Optimization Engine
                </span>
              </div>
              <span className="text-[13px] text-secondary-fixed font-bold">99.8% Efficiency</span>
            </div>
            <div className="space-y-4">
              <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-secondary-fixed w-[75%] rounded-full" />
              </div>
              <div className="flex justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <div className="h-1.5 w-[40%] bg-white/10 rounded-full" />
                  <div className="h-1.5 w-[90%] bg-white/10 rounded-full" />
                  <div className="h-1.5 w-[60%] bg-white/10 rounded-full" />
                </div>
                <div className="w-24 h-12 bg-secondary-container/10 border border-secondary/20 rounded-lg flex items-center justify-center">
                  <span className="material-symbols-outlined text-secondary-fixed text-lg">insights</span>
                </div>
              </div>
            </div>
            <div className="mt-8 rounded-2xl overflow-hidden aspect-video border border-white/5 relative">
              <div className="absolute inset-0 bg-gradient-to-tr from-primary via-primary/50 to-transparent z-10" />
              <img
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuCyBizFegNlX5pmMmhzFZPQfqBMpnIP1VmZ0jJpFLTvORw-Y-AwbsMrYBnlqLdL2vcrNVzXVWlwogAzE20KV0aR2EjEB9ZxQKZuHrHQLsU_5pw_pxDL40AgL9Y_7D1sy358flgTIgVd7r8iAJ9zM0hRACnA9JAlgkOo65c-YG9FCxm3odrlovO5QygIDUJnC2dncVw193Ruqj33K9Hl134VB62YOHzIiM7G0ownRC3qWYsKs-sHfqE"
                alt="Logistics AI visualization"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
          <div className="space-y-6">
            <p className="text-[40px] font-semibold leading-[1.2] text-white">
              "ShipMind isn't just a tool; it's the operational brain we've needed for a decade."
            </p>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white/20">
                <img
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuAIcCaMPpaDcW6ab1T6kKK1SDLPNQ3ewYo8Gr55OwW-qyix_jUNpAEelTNqFWoQUwT12XwecTAHuCiZLY048p4QWVgT7IU92JJ18OGw9JHBVbg2Ud7WX6hq7Hsyv-wfNthvLOkbInbhbJniizQz95AqfpcvtnamFNLWHEaorQP-QxM-17g41XSm4aMqap6TmJ7X8vN26OD6jNNT5_TGM6LwthNq7FZxdovjo3wCZozhh7nEyfR80wY"
                  alt="James Sterling"
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <p className="text-[15px] font-bold text-white">James Sterling</p>
                <p className="text-[13px] text-white/50">CEO, Global Logistics Alliance</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Right: Form */}
      <section className="w-full md:w-1/2 lg:w-[45%] bg-surface flex flex-col justify-center items-center px-6 py-12 md:px-16">
        <div className="w-full max-w-md space-y-10 animate-slide-up" style={{ animationDelay: "0.2s" }}>
          <div className="space-y-2">
            <h1 className="text-[40px] font-semibold leading-[1.2] tracking-[-0.03em] text-primary">
              {isLogin ? "Welcome back" : "Create your account"}
            </h1>
            <p className="text-[15px] text-on-surface-variant">
              {isLogin ? "Login to your dashboard to manage shipments." : "Join 200+ enterprise teams optimizing their fleet with AI."}
            </p>
          </div>

          {done ? (
            <div className="p-8 bg-secondary/10 rounded-xl border border-secondary/20 text-center space-y-2">
              <span className="material-symbols-outlined text-secondary text-5xl" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
              <p className="text-2xl font-semibold text-primary">{isLogin ? "Logged in successfully!" : "Account created!"}</p>
              <p className="text-[15px] text-on-surface-variant">Redirecting to Dashboard...</p>
            </div>
          ) : (
            <form className="space-y-6" onSubmit={handleSubmit}>
              {!isLogin && (
                <div className="space-y-2">
                  <label className="text-[13px] text-on-surface-variant" htmlFor="name">Full Name</label>
                  <input
                    id="name"
                    type="text"
                    placeholder="John Doe"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-4 py-3 bg-white border border-outline-variant rounded-xl text-[15px] focus:outline-none focus:border-primary focus:shadow-sm transition-all"
                    required
                  />
                </div>
              )}
              <div className="space-y-2">
                <label className="text-[13px] text-on-surface-variant" htmlFor="email">Work Email</label>
                <input
                  id="email"
                  type="email"
                  placeholder="john@company.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-4 py-3 bg-white border border-outline-variant rounded-xl text-[15px] focus:outline-none focus:border-primary focus:shadow-sm transition-all"
                  required
                />
              </div>
              {!isLogin && (
                <div className="space-y-2">
                  <label className="text-[13px] text-on-surface-variant" htmlFor="size">Company Size</label>
                  <div className="relative">
                    <select
                      id="size"
                      value={form.size}
                      onChange={(e) => setForm({ ...form, size: e.target.value })}
                      className="w-full appearance-none px-4 py-3 bg-white border border-outline-variant rounded-xl text-[15px] focus:outline-none focus:border-primary transition-all pr-10"
                      required
                    >
                      <option value="" disabled>Select company size</option>
                      <option value="1-50">1 - 50 employees</option>
                      <option value="51-200">51 - 200 employees</option>
                      <option value="201-1000">201 - 1,000 employees</option>
                      <option value="1000+">1,000+ employees</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-on-surface-variant">
                      <span className="material-symbols-outlined">expand_more</span>
                    </div>
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <label className="text-[13px] text-on-surface-variant" htmlFor="password">Password</label>
                <input
                  id="password"
                  type="password"
                  placeholder="Min. 8 characters"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full px-4 py-3 bg-white border border-outline-variant rounded-xl text-[15px] focus:outline-none focus:border-primary focus:shadow-sm transition-all"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-primary text-white text-[15px] font-semibold rounded-xl hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 group"
              >
                {loading ? (
                  <span className="material-symbols-outlined animate-spin">progress_activity</span>
                ) : (
                  <>
                    {isLogin ? "Login" : "Get Started"}
                    <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span>
                  </>
                )}
              </button>
            </form>
          )}

          <div className="space-y-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-outline-variant/30" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-surface px-4 text-on-surface-variant text-[13px]">Or continue with</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => {
                  setLoading(true);
                  setTimeout(() => {
                    setLoading(false);
                    navigate("/app/dashboard");
                  }, 800);
                }}
                className="flex items-center justify-center gap-3 px-4 py-3 border border-outline-variant rounded-xl hover:bg-surface-container-low transition-colors text-[15px]"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                Google
              </button>
              <button
                onClick={() => {
                  setLoading(true);
                  setTimeout(() => {
                    setLoading(false);
                    navigate("/app/dashboard");
                  }, 800);
                }}
                className="flex items-center justify-center gap-3 px-4 py-3 border border-outline-variant rounded-xl hover:bg-surface-container-low transition-colors text-[15px]"
              >
                <span className="material-symbols-outlined text-[20px]">corporate_fare</span>
                SSO
              </button>
            </div>
          </div>

          <p className="text-center text-[15px] text-on-surface-variant">
            {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setDone(false);
              }}
              className="text-primary font-bold hover:underline ml-1"
            >
              {isLogin ? "Get Started" : "Login"}
            </button>
          </p>
          <p className="text-[13px] text-on-surface-variant/60 text-center">
            By registering, you agree to our{" "}
            <Link to="/terms" className="underline">Terms</Link> and{" "}
            <Link to="/privacy" className="underline">Privacy Policy</Link>. © 2024 ShipMind AI.
          </p>
        </div>
      </section>
    </div>
  );
}
