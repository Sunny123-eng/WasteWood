import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { exportDatasetToExcel } from '@/lib/excelExport';
import { exportDatasetToPdf } from '@/lib/pdfExport';
import { exportBackup, importBackup, clearAllData } from '@/lib/backup';
import { closeMonth, fetchExportDataset, listArchives, downloadArchive } from '@/lib/closeMonth';
import { toast } from '@/hooks/use-toast';
import { Download, Upload, FileSpreadsheet, FileText, Trash2, Archive, CalendarCheck } from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { formatCurrency, formatDate } from '@/lib/format';

interface ArchiveRow {
  id: string;
  period_label: string;
  created_at: string;
  totals: { netProfit?: number; totalSales?: number } | null;
}

export default function DataManagement() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [working, setWorking] = useState<string | null>(null);
  const [archives, setArchives] = useState<ArchiveRow[]>([]);

  const loadArchives = async () => {
    try {
      const a = await listArchives();
      setArchives(a as ArchiveRow[]);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => { loadArchives(); }, []);

  const run = async (label: string, fn: () => Promise<void>) => {
    setWorking(label);
    try { await fn(); }
    finally { setWorking(null); }
  };

  const handleExcel = () => run('excel', async () => {
    try {
      const d = await fetchExportDataset();
      exportDatasetToExcel(d);
      toast({ title: 'Excel exported', description: 'Check your downloads folder.' });
    } catch (e) {
      toast({ title: 'Export failed', description: String(e), variant: 'destructive' });
    }
  });

  const handlePdf = () => run('pdf', async () => {
    try {
      const d = await fetchExportDataset();
      exportDatasetToPdf(d, 'Wood Trading Report');
      toast({ title: 'PDF exported', description: 'Check your downloads folder.' });
    } catch (e) {
      toast({ title: 'Export failed', description: String(e), variant: 'destructive' });
    }
  });

  const handleBackup = () => run('backup', async () => {
    try {
      await exportBackup();
      toast({ title: 'Backup downloaded', description: 'Save this file safely.' });
    } catch (e) {
      toast({ title: 'Backup failed', description: String(e), variant: 'destructive' });
    }
  });

  const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      await importBackup(file);
      toast({ title: 'Backup restored', description: 'Reloading...' });
      setTimeout(() => window.location.reload(), 800);
    } catch (err) {
      toast({ title: 'Restore failed', description: String(err), variant: 'destructive' });
      setImporting(false);
    }
  };

  const handleClear = () => run('clear', async () => {
    try {
      await clearAllData();
      toast({ title: 'All data cleared' });
      setTimeout(() => window.location.reload(), 600);
    } catch (e) {
      toast({ title: 'Clear failed', description: String(e), variant: 'destructive' });
    }
  });

  const handleCloseMonth = () => run('close', async () => {
    try {
      const r = await closeMonth();
      toast({
        title: `${r.periodLabel} archived`,
        description: 'Excel + PDF downloaded. Transactions reset; outstanding kept.',
      });
      await loadArchives();
    } catch (e) {
      toast({ title: 'Close month failed', description: String(e), variant: 'destructive' });
    }
  });

  const handleArchiveDownload = (id: string, fmt: 'xlsx' | 'pdf') => run(`archive-${id}-${fmt}`, async () => {
    try { await downloadArchive(id, fmt); }
    catch (e) { toast({ title: 'Download failed', description: String(e), variant: 'destructive' }); }
  });

  return (
    <div className="p-4 space-y-4 pb-24">
      <h1 className="text-xl font-bold">Data Management</h1>

      <Card className="border-primary/40">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarCheck className="h-5 w-5 text-primary" /> Close Month
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Archive the current month's data, download Excel + PDF copies, then clear transactions.
            Cash/Bank balances and unsettled outstanding (credit) carry forward as opening entries.
          </p>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button className="w-full" disabled={!!working}>
                <CalendarCheck className="mr-2 h-4 w-4" />
                {working === 'close' ? 'Closing month…' : 'Close Current Month'}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Close current month?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will archive all current data (saved permanently and accessible below),
                  download Excel + PDF reports, and reset transactions for a fresh month.
                  Balances and outstanding credit will be preserved.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleCloseMonth}>Yes, close month</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Archive className="h-5 w-5 text-accent" /> Monthly Archives
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {archives.length === 0 ? (
            <p className="text-sm text-muted-foreground">No archives yet. Use Close Month to create one.</p>
          ) : (
            <div className="space-y-2">
              {archives.map(a => (
                <div key={a.id} className="rounded-lg border p-3 space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold">{a.period_label}</p>
                      <p className="text-xs text-muted-foreground">Closed {formatDate(a.created_at)}</p>
                    </div>
                    {a.totals?.netProfit !== undefined && (
                      <p className="text-sm font-medium text-success">
                        {formatCurrency(a.totals.netProfit)}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="secondary" className="flex-1"
                      onClick={() => handleArchiveDownload(a.id, 'xlsx')}
                      disabled={!!working}>
                      <FileSpreadsheet className="mr-1 h-3 w-3" /> Excel
                    </Button>
                    <Button size="sm" variant="secondary" className="flex-1"
                      onClick={() => handleArchiveDownload(a.id, 'pdf')}
                      disabled={!!working}>
                      <FileText className="mr-1 h-3 w-3" /> PDF
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-success" /> Excel Export
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Multi-sheet workbook: Sales, Purchases, Expenses, Payments, Outstanding, Partner Accounts.
          </p>
          <Button onClick={handleExcel} className="w-full" disabled={!!working}>
            <Download className="mr-2 h-4 w-4" />
            {working === 'excel' ? 'Exporting…' : 'Download Excel'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" /> PDF Report
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Printable PDF with summary + detail tables for every module.
          </p>
          <Button onClick={handlePdf} variant="secondary" className="w-full" disabled={!!working}>
            <Download className="mr-2 h-4 w-4" />
            {working === 'pdf' ? 'Exporting…' : 'Download PDF'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Download className="h-5 w-5 text-primary" /> Backup
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Full JSON backup of every record + balances + settings.
          </p>
          <Button onClick={handleBackup} variant="secondary" className="w-full" disabled={!!working}>
            <Download className="mr-2 h-4 w-4" />
            {working === 'backup' ? 'Building…' : 'Download Backup (.json)'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Upload className="h-5 w-5 text-accent" /> Restore
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Restore from a JSON backup. This will REPLACE all current data.
          </p>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={handleRestore}
          />
          <Button onClick={() => fileRef.current?.click()} variant="secondary" className="w-full" disabled={importing || !!working}>
            <Upload className="mr-2 h-4 w-4" /> {importing ? 'Restoring…' : 'Choose Backup File'}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-destructive/40">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2 text-destructive">
            <Trash2 className="h-5 w-5" /> Danger Zone
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Permanently delete every transaction, master, and reset balances. Cannot be undone.
          </p>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="w-full" disabled={!!working}>
                <Trash2 className="mr-2 h-4 w-4" /> Clear All Data
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Clear all data?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will erase every transaction, party, sawmill, and reset balances to zero.
                  Make sure you have a backup first.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleClear} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Yes, delete everything
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}
