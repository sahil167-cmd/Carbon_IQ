import { Navigate } from "react-router-dom";

/**
 * ProtectedRoute — wraps any app page component.
 * If no access_token is in localStorage, redirects to /login.
 * This is a client-side guard; the real security is the JWT on the backend.
 */
export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem("access_token");

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
