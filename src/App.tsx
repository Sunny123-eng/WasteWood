import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "@/components/Layout";
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
import Withdrawals from "./pages/Withdrawals";
import ProfitSettlement from "./pages/ProfitSettlement";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Index />} />
            <Route path="/purchase" element={<Purchase />} />
            <Route path="/sale" element={<Sale />} />
            <Route path="/expense" element={<Expense />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/history" element={<History />} />
            <Route path="/payment-received" element={<PaymentReceived />} />
            <Route path="/payment-made" element={<PaymentMade />} />
            <Route path="/outstanding" element={<Outstanding />} />
            <Route path="/ledger/:type/:id" element={<Ledger />} />
            <Route path="/withdrawals" element={<Withdrawals />} />
            <Route path="/profit" element={<ProfitSettlement />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
