import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import { AppLayout } from "./components/AppLayout";
import Dashboard from "./pages/Dashboard";
import RequisitionList from "./pages/RequisitionList";
import RequisitionDetail from "./pages/RequisitionDetail";
import NewRequisition from "./pages/NewRequisition";
import ManageRoles from "./pages/ManageRoles";
import Cashbook from "./pages/Cashbook";
import ChartOfAccounts from "./pages/ChartOfAccounts";
import OpeningBalances from "./pages/OpeningBalances";
import ManualJournal from "./pages/ManualJournal";
import Payments from "./pages/Payments";
import Receipts from "./pages/Receipts";
import Revenue from "./pages/Revenue";
import DirectExpenses from "./pages/DirectExpenses";
import AssetsRegister from "./pages/AssetsRegister";
import LiabilitiesRegister from "./pages/LiabilitiesRegister";
import GeneralLedger from "./pages/GeneralLedger";
import Reports from "./pages/Reports";
import Quotations from "./pages/Quotations";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center min-h-screen"><p className="text-muted-foreground">Loading...</p></div>;
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

function AuthRoute() {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center min-h-screen"><p className="text-muted-foreground">Loading...</p></div>;
  if (user) return <Navigate to="/" replace />;
  return <Auth />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<AuthRoute />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/requisitions" element={<RequisitionList />} />
              <Route path="/requisitions/new" element={<NewRequisition />} />
              <Route path="/requisitions/:id" element={<RequisitionDetail />} />
              <Route path="/cashbook" element={<Cashbook />} />
              <Route path="/manage-roles" element={<ManageRoles />} />
              {/* Accounting Module */}
              <Route path="/accounting/coa" element={<ChartOfAccounts />} />
              <Route path="/accounting/opening-balances" element={<OpeningBalances />} />
              <Route path="/accounting/journal" element={<ManualJournal />} />
              <Route path="/accounting/payments" element={<Payments />} />
              <Route path="/accounting/receipts" element={<Receipts />} />
              <Route path="/accounting/revenue" element={<Revenue />} />
              <Route path="/accounting/expenses" element={<DirectExpenses />} />
              <Route path="/accounting/assets" element={<AssetsRegister />} />
              <Route path="/accounting/liabilities" element={<LiabilitiesRegister />} />
              <Route path="/accounting/ledger" element={<GeneralLedger />} />
              <Route path="/accounting/reports" element={<Reports />} />
              <Route path="/accounting/quotations" element={<Quotations />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
