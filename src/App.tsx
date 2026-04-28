import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { DataStoreProvider } from "@/hooks/useDataStore";
import ProtectedRoute from "@/components/ProtectedRoute";
import Layout from "@/components/Layout";
import Auth from "./pages/Auth";
import Index from "./pages/Index";
import Purchase from "./pages/Purchase";
import Sale from "./pages/Sale";
import Expense from "./pages/Expense";
import Settings from "./pages/Settings";
import History from "./pages/History";
import PaymentReceived from "./pages/PaymentReceived";
import PaymentMade from "./pages/PaymentMade";
import Outstanding from "./pages/Outstanding";
import Ledger from "./pages/Ledger";
import Ledgers from "./pages/Ledgers";
import Withdrawals from "./pages/Withdrawals";
import ProfitSettlement from "./pages/ProfitSettlement";
import VehicleProfit from "./pages/VehicleProfit";
import DataManagement from "./pages/DataManagement";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <DataStoreProvider>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                <Route path="/" element={<Index />} />
                <Route path="/purchase" element={<ProtectedRoute adminOnly><Purchase /></ProtectedRoute>} />
                <Route path="/sale" element={<ProtectedRoute adminOnly><Sale /></ProtectedRoute>} />
                <Route path="/expense" element={<ProtectedRoute adminOnly><Expense /></ProtectedRoute>} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/history" element={<History />} />
                <Route path="/payment-received" element={<ProtectedRoute adminOnly><PaymentReceived /></ProtectedRoute>} />
                <Route path="/payment-made" element={<ProtectedRoute adminOnly><PaymentMade /></ProtectedRoute>} />
                <Route path="/outstanding" element={<Outstanding />} />
                <Route path="/ledger/:type/:id" element={<Ledger />} />
                <Route path="/ledgers" element={<Ledgers />} />
                <Route path="/withdrawals" element={<ProtectedRoute adminOnly><Withdrawals /></ProtectedRoute>} />
                <Route path="/profit" element={<ProfitSettlement />} />
                <Route path="/vehicle-profit" element={<VehicleProfit />} />
                <Route path="/data" element={<ProtectedRoute adminOnly><DataManagement /></ProtectedRoute>} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </DataStoreProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
