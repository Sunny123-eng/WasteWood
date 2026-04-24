import { useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { exportAllToExcel } from '@/lib/excelExport';
import { exportBackup, importBackup, clearAllData } from '@/lib/backup';
import { toast } from '@/hooks/use-toast';
import { Download, Upload, FileSpreadsheet, Trash2 } from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export default function DataManagement() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);

  const handleExcel = () => {
    try {
      exportAllToExcel();
      toast({ title: 'Excel exported', description: 'Check your downloads folder.' });
    } catch (e) {
      toast({ title: 'Export failed', description: String(e), variant: 'destructive' });
    }
  };

  const handleBackup = () => {
    try {
      exportBackup();
      toast({ title: 'Backup downloaded', description: 'Save this file safely.' });
    } catch (e) {
      toast({ title: 'Backup failed', description: String(e), variant: 'destructive' });
    }
  };

  const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      await importBackup(file);
      toast({ title: 'Backup restored', description: 'Reloading app...' });
      setTimeout(() => window.location.reload(), 800);
    } catch (err) {
      toast({ title: 'Restore failed', description: String(err), variant: 'destructive' });
      setImporting(false);
    }
  };

  const handleClear = () => {
    clearAllData();
    toast({ title: 'All data cleared' });
    setTimeout(() => window.location.reload(), 600);
  };

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold">Data Management</h1>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-success" /> Excel Export
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Export all sales, purchases, expenses, payments, outstanding, and partner accounts to a multi-sheet Excel file.
          </p>
          <Button onClick={handleExcel} className="w-full">
            <Download className="mr-2 h-4 w-4" /> Download Excel
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
            Download a complete JSON backup of all your data. Keep it safe — you can restore it later.
          </p>
          <Button onClick={handleBackup} variant="secondary" className="w-full">
            <Download className="mr-2 h-4 w-4" /> Download Backup (.json)
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
            Restore from a previously downloaded backup. This will overwrite current data.
          </p>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={handleRestore}
          />
          <Button onClick={() => fileRef.current?.click()} variant="secondary" className="w-full" disabled={importing}>
            <Upload className="mr-2 h-4 w-4" /> {importing ? 'Restoring...' : 'Choose Backup File'}
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
            Permanently delete all transactions, master data, and balances.
          </p>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="w-full">
                <Trash2 className="mr-2 h-4 w-4" /> Clear All Data
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Clear all data?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently erase every transaction, party, sawmill, and balance. Make sure you have a backup first. This cannot be undone.
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
