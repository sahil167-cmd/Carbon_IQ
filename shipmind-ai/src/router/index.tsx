import { createBrowserRouter } from "react-router-dom";

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

export const router = createBrowserRouter([
  // Marketing
  { path: "/", element: <Home /> },
  { path: "/about", element: <About /> },
  { path: "/contact", element: <Contact /> },
  { path: "/pricing", element: <Pricing /> },
  { path: "/pricing/premium", element: <PremiumPricing /> },
  { path: "/register", element: <Register /> },
  { path: "/login", element: <Register isLoginInitial={true} /> },
  { path: "/docs", element: <Documentation /> },
  { path: "/integrations", element: <Integrations /> },

  // App
  { path: "/app/dashboard", element: <Dashboard /> },
  { path: "/app/analytics", element: <Analytics /> },
  { path: "/app/analytics/enterprise", element: <EnterpriseAnalytics /> },
  { path: "/app/dashboard/enterprise", element: <EnterpriseDashboard /> },
  { path: "/app/documents", element: <DocumentLibrary /> },
  { path: "/app/documents/pro", element: <DocumentLibraryPro /> },
  { path: "/app/documents/:id", element: <DocumentDetails /> },
  { path: "/app/documents/:id/review", element: <DocumentReviewWorkspace /> },
  { path: "/app/upload", element: <UploadCenter /> },
  { path: "/app/upload/pro", element: <UploadCenterPro /> },
  { path: "/app/upload/wizard", element: <UploadWizard /> },
  { path: "/app/insights", element: <AIInsights /> },
  { path: "/app/review-queue", element: <AIReviewQueue /> },
  { path: "/app/manual-entry", element: <ManualEntry /> },
  { path: "/app/admin", element: <AdminConsole /> },
  { path: "/app/settings/organization", element: <OrganizationSettings /> },
  { path: "/app/settings/team", element: <TeamRoles /> },
  { path: "/app/intelligence", element: <IntelligenceSystem /> },
  { path: "/app/support", element: <Support /> },
  { path: "/app/account", element: <Account /> },

  // Mapped sidebar routes
  { path: "/app/shipments", element: <DocumentLibraryPro /> },
  { path: "/app/fleet", element: <EnterpriseDashboard /> },

  // Catch-all redirect
  { path: "*", element: <Home /> },
]);
