import { createBrowserRouter } from "react-router-dom";
import ProtectedRoute from "../components/ProtectedRoute";

// Marketing Pages
import Home from "../pages/Home";
import About from "../pages/About";
import Contact from "../pages/Contact";
import Pricing from "../pages/Pricing";
import PremiumPricing from "../pages/PremiumPricing";
import Register from "../pages/Register";
import Documentation from "../pages/Documentation";
import Integrations from "../pages/Integrations";

// App Pages
import Dashboard from "../pages/app/Dashboard";
import Analytics from "../pages/app/Analytics";
import EnterpriseAnalytics from "../pages/app/EnterpriseAnalytics";
import EnterpriseDashboard from "../pages/app/EnterpriseDashboard";
import DocumentLibrary from "../pages/app/DocumentLibrary";
import DocumentLibraryPro from "../pages/app/DocumentLibraryPro";
import DocumentDetails from "../pages/app/DocumentDetails";
import DocumentReviewWorkspace from "../pages/app/DocumentReviewWorkspace";
import UploadCenter from "../pages/app/UploadCenter";
import UploadCenterPro from "../pages/app/UploadCenterPro";
import UploadWizard from "../pages/app/UploadWizard";
import AIInsights from "../pages/app/AIInsights";
import AIReviewQueue from "../pages/app/AIReviewQueue";
import ManualEntry from "../pages/app/ManualEntry";
import AdminConsole from "../pages/app/AdminConsole";
import OrganizationSettings from "../pages/app/OrganizationSettings";
import TeamRoles from "../pages/app/TeamRoles";
import IntelligenceSystem from "../pages/app/IntelligenceSystem";
import Support from "../pages/app/Support";
import Account from "../pages/app/Account";

/** Wrap a JSX element in ProtectedRoute (redirects to /login if not authenticated) */
function P(element: JSX.Element) {
  return <ProtectedRoute>{element}</ProtectedRoute>;
}

export const router = createBrowserRouter([
  // Marketing (public)
  { path: "/", element: <Home /> },
  { path: "/about", element: <About /> },
  { path: "/contact", element: <Contact /> },
  { path: "/pricing", element: <Pricing /> },
  { path: "/pricing/premium", element: <PremiumPricing /> },
  { path: "/register", element: <Register /> },
  { path: "/login", element: <Register isLoginInitial={true} /> },
  { path: "/docs", element: <Documentation /> },
  { path: "/integrations", element: <Integrations /> },

  // App (protected — require JWT in localStorage)
  { path: "/app/dashboard", element: P(<Dashboard />) },
  { path: "/app/analytics", element: P(<Analytics />) },
  { path: "/app/analytics/enterprise", element: P(<EnterpriseAnalytics />) },
  { path: "/app/dashboard/enterprise", element: P(<EnterpriseDashboard />) },
  { path: "/app/documents", element: P(<DocumentLibrary />) },
  { path: "/app/documents/pro", element: P(<DocumentLibraryPro />) },
  { path: "/app/documents/:id", element: P(<DocumentDetails />) },
  { path: "/app/documents/:id/review", element: P(<DocumentReviewWorkspace />) },
  { path: "/app/upload", element: P(<UploadCenter />) },
  { path: "/app/upload/pro", element: P(<UploadCenterPro />) },
  { path: "/app/upload/wizard", element: P(<UploadWizard />) },
  { path: "/app/upload-wizard", element: P(<UploadWizard />) },
  { path: "/app/insights", element: P(<AIInsights />) },
  { path: "/app/review-queue", element: P(<AIReviewQueue />) },
  { path: "/app/manual-entry", element: P(<ManualEntry />) },
  { path: "/app/admin", element: P(<AdminConsole />) },
  { path: "/app/settings/organization", element: P(<OrganizationSettings />) },
  { path: "/app/settings/team", element: P(<TeamRoles />) },
  { path: "/app/intelligence", element: P(<IntelligenceSystem />) },
  { path: "/app/support", element: P(<Support />) },
  { path: "/app/account", element: P(<Account />) },

  // Sidebar mapped routes
  { path: "/app/shipments", element: P(<DocumentLibrary />) },
  { path: "/app/fleet", element: P(<EnterpriseDashboard />) },

  // Catch-all
  { path: "*", element: <Home /> },
]);
