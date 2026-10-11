import { useState } from 'react';
import { useRouteError, isRouteErrorResponse, Link, useNavigate } from 'react-router-dom';
import { AlertTriangle, RefreshCw, Home, Truck, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react';

export default function RouteErrorBoundary() {
  const error = useRouteError();
  const navigate = useNavigate();
  const [showDetails, setShowDetails] = useState(false);
  const [copied, setCopied] = useState(false);

  let errorMessage = 'An unexpected application error occurred.';
  let errorStatus = 500;
  let stackTrace = '';

  if (isRouteErrorResponse(error)) {
    errorStatus = error.status;
    errorMessage = error.statusText || error.data?.message || 'Route Error';
    stackTrace = JSON.stringify(error.data, null, 2);
  } else if (error instanceof Error) {
    errorMessage = error.message;
    stackTrace = error.stack || '';
  } else if (typeof error === 'string') {
    errorMessage = error;
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(`${errorMessage}\n\n${stackTrace}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-6 font-sans">
      <div className="max-w-xl w-full bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
        {/* Header Ribbon */}
        <div className="bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 p-6 text-white text-center sm:text-left flex flex-col sm:flex-row items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 border border-white/30">
            <AlertTriangle className="w-7 h-7 text-white" />
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-red-100">
              System Error {errorStatus ? `• Code ${errorStatus}` : ''}
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white mt-0.5">
              Something went wrong
            </h1>
            <p className="text-sm text-red-100/90 mt-1">
              CarbonIQ caught an unhandled interface exception.
            </p>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          <div className="p-4 rounded-2xl bg-red-50/60 border border-red-200/80 text-red-900">
            <div className="text-xs font-bold uppercase tracking-wider text-red-600 mb-1">Error Diagnostic</div>
            <p className="font-mono text-sm font-semibold break-words">{errorMessage}</p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm transition-all shadow-sm active:scale-[0.98]"
            >
              <RefreshCw className="w-4 h-4" />
              Reload Page
            </button>

            <button
              type="button"
              onClick={() => navigate('/app/logistics')}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#0F6B3A] hover:bg-[#125C3A] text-white font-semibold text-sm transition-all shadow-sm active:scale-[0.98]"
            >
              <Truck className="w-4 h-4" />
              Logistics
            </button>

            <Link
              to="/app/dashboard"
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm transition-all"
            >
              <Home className="w-4 h-4" />
              Dashboard
            </Link>
          </div>

          {/* Technical Details Toggle */}
          {stackTrace && (
            <div className="pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowDetails(!showDetails)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700 transition-colors"
              >
                <span>{showDetails ? 'Hide technical trace' : 'View technical trace'}</span>
                {showDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {showDetails && (
                <div className="mt-3 relative">
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="absolute top-2 right-2 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-mono flex items-center gap-1"
                  >
                    {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                  <pre className="bg-slate-900 text-slate-200 p-4 pt-8 rounded-xl text-xs font-mono overflow-x-auto max-h-56 leading-relaxed">
                    {stackTrace}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
