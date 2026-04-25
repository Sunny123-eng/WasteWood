import SawmillList from '@/components/master/SawmillList';
import PartyList from '@/components/master/PartyList';
import { Separator } from '@/components/ui/separator';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowDownLeft, ArrowUpRight, Clock, CreditCard, Wallet, PieChart, Database } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const quickLinks = [
  { label: 'Payment Received', icon: ArrowDownLeft, path: '/payment-received', color: 'text-success', adminOnly: true },
  { label: 'Payment Made', icon: ArrowUpRight, path: '/payment-made', color: 'text-destructive', adminOnly: true },
  { label: 'Outstanding', icon: CreditCard, path: '/outstanding', color: 'text-primary' },
  { label: 'History', icon: Clock, path: '/history', color: 'text-accent' },
  { label: 'Withdrawals', icon: Wallet, path: '/withdrawals', color: 'text-warning', adminOnly: true },
  { label: 'Profit & Settlement', icon: PieChart, path: '/profit', color: 'text-primary' },
  { label: 'Data & Backup', icon: Database, path: '/data', color: 'text-success', adminOnly: true },
];

export default function Settings() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const links = quickLinks.filter(l => !l.adminOnly || isAdmin);

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-xl font-bold">Settings & More</h1>

      <div className="grid grid-cols-2 gap-3">
        {links.map(({ label, icon: Icon, path, color }) => (
          <Card key={path} className="cursor-pointer active:scale-[0.98] transition-transform" onClick={() => navigate(path)}>
            <CardContent className="flex items-center gap-3 p-4">
              <div className={`rounded-lg bg-muted p-2 ${color}`}>
                <Icon className="h-5 w-5" />
              </div>
              <p className="text-sm font-medium">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {isAdmin && (
        <>
          <Separator />
          <SawmillList />
          <Separator />
          <PartyList />
        </>
      )}
    </div>
  );
}
