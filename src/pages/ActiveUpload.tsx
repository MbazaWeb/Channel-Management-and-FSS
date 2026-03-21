import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { Shield, Upload, Download, ArrowLeft, FileText, Check, X, AlertCircle, RefreshCw, Activity, TrendingUp, Users, Calendar } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type Application = Database['public']['Tables']['applications']['Row'] & {
  territories?: { name: string } | null;
  zones?: { name: string } | null;
};

interface ParsedRow {
  identifier: string; // trading_name OR d_number OR email
  identifierType: 'trading_name' | 'd_number' | 'email';
  originalValue: string;
  found: boolean;
  applicationId?: string;
  channelName?: string;
  channel?: string;
  currentStatus?: boolean;
  error?: string;
}

export default function ActiveUpload() {
  const { role } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [activeMonth, setActiveMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // Fetch all approved applications for matching
  const { data: applications = [], isLoading: appsLoading } = useQuery({
    queryKey: ['applications-for-active'],
    queryFn: async () => {
      const { data } = await supabase
        .from('applications')
        .select('*, territories(name), zones(name)')
        .eq('status', 'approved')
        .order('trading_name');
      return (data ?? []) as Application[];
    },
  });

  // Stats for current active status
  const activeStats = {
    totalApproved: applications.length,
    currentlyActive: applications.filter(a => a.is_active).length,
    esp: applications.filter(a => a.channel === 'ESP' || !a.channel),
    dsf: applications.filter(a => a.channel === 'DSF'),
    espActive: applications.filter(a => (a.channel === 'ESP' || !a.channel) && a.is_active).length,
    dsfActive: applications.filter(a => a.channel === 'DSF' && a.is_active).length,
  };

  // Download template
  const downloadTemplate = () => {
    const headers = ['identifier', 'identifier_type'];
    const exampleRows = [
      ['ABC Trading Ltd', 'trading_name'],
      ['D12345', 'd_number'],
      ['agent@example.com', 'email'],
      ['XYZ Electronics', 'trading_name'],
    ];

    const csvContent = [
      headers.join(','),
      ...exampleRows.map(row => row.map(v => `"${v}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `active_channels_template_${activeMonth}.csv`;
    link.click();
  };

  // Parse CSV file
  const parseCSV = useCallback((text: string): ParsedRow[] => {
    const lines = text.split(/\r?\n/).filter(line => line.trim());
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim().toLowerCase());
    const identifierIdx = headers.findIndex(h => h.includes('identifier') && !h.includes('type'));
    const typeIdx = headers.findIndex(h => h.includes('type'));

    const rows: ParsedRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.replace(/"/g, '').trim());
      if (values.length < 1 || !values[0]) continue;

      const identifier = values[identifierIdx >= 0 ? identifierIdx : 0] || '';
      const identifierType = (values[typeIdx >= 0 ? typeIdx : 1] || 'trading_name') as 'trading_name' | 'd_number' | 'email';

      // Try to find matching application
      let matchedApp: Application | undefined;
      
      switch (identifierType) {
        case 'd_number':
          matchedApp = applications.find(a => 
            a.dsf_d_number?.toLowerCase() === identifier.toLowerCase()
          );
          break;
        case 'email':
          matchedApp = applications.find(a => 
            a.email1?.toLowerCase() === identifier.toLowerCase() ||
            a.email2?.toLowerCase() === identifier.toLowerCase()
          );
          break;
        case 'trading_name':
        default:
          // Fuzzy match for trading name
          matchedApp = applications.find(a => 
            a.trading_name?.toLowerCase() === identifier.toLowerCase() ||
            a.trading_name?.toLowerCase().includes(identifier.toLowerCase()) ||
            identifier.toLowerCase().includes(a.trading_name?.toLowerCase() || '')
          );
          if (!matchedApp) {
            // Try matching by contact person name
            matchedApp = applications.find(a => 
              `${a.contact_person_name} ${a.contact_person_surname}`.toLowerCase() === identifier.toLowerCase()
            );
          }
          break;
      }

      rows.push({
        identifier,
        identifierType,
        originalValue: lines[i],
        found: !!matchedApp,
        applicationId: matchedApp?.id,
        channelName: matchedApp?.trading_name || (matchedApp ? `${matchedApp.contact_person_name} ${matchedApp.contact_person_surname}` : undefined),
        channel: matchedApp?.channel || 'ESP',
        currentStatus: matchedApp?.is_active,
        error: !matchedApp ? 'No matching channel found in database' : undefined,
      });
    }

    return rows;
  }, [applications]);

  // Handle file upload
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.csv')) {
      toast.error('Please upload a CSV file');
      return;
    }

    setFile(selectedFile);
    setIsProcessing(true);

    try {
      const text = await selectedFile.text();
      const parsed = parseCSV(text);
      setParsedData(parsed);
      
      const found = parsed.filter(p => p.found).length;
      const notFound = parsed.filter(p => !p.found).length;
      
      toast.success(
        `Parsed ${parsed.length} rows: ${found} matched, ${notFound} not found`,
        { duration: 5000 }
      );
    } catch (error) {
      toast.error('Error parsing CSV file');
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Process active upload
  const processActiveMutation = useMutation({
    mutationFn: async () => {
      const validRows = parsedData.filter(p => p.found && p.applicationId);
      const total = validRows.length;
      let processed = 0;

      // First, reset all applications to inactive for this exercise
      // (Only if we're doing a full reset for the month)
      const shouldResetAll = window.confirm(
        'Do you want to reset all channels to inactive first?\n\n' +
        'YES = Mark all as inactive, then only uploaded list as active\n' +
        'NO = Keep current active status, just add/update the uploaded list'
      );

      if (shouldResetAll) {
        const { error: resetError } = await supabase
          .from('applications')
          .update({ is_active: false })
          .eq('status', 'approved');
        
        if (resetError) throw resetError;
      }

      // Mark uploaded channels as active
      for (const row of validRows) {
        const { error } = await supabase
          .from('applications')
          .update({
            is_active: true,
            last_active_date: new Date().toISOString().split('T')[0],
            last_active_month: activeMonth,
          })
          .eq('id', row.applicationId);

        if (error) throw error;
        
        processed++;
        setUploadProgress(Math.round((processed / total) * 100));
      }

      return { processed, total };
    },
    onSuccess: (data) => {
      toast.success(`Successfully marked ${data.processed} channels as active for ${activeMonth}`);
      queryClient.invalidateQueries({ queryKey: ['applications-for-active'] });
      queryClient.invalidateQueries({ queryKey: ['public-applications'] });
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      setParsedData([]);
      setFile(null);
      setUploadProgress(0);
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  // Reset all to inactive
  const resetAllMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('applications')
        .update({ is_active: false })
        .eq('status', 'approved');

      if (error) throw error;
      return { count: applications.length };
    },
    onSuccess: (data) => {
      toast.success(`Reset ${data.count} channels to inactive`);
      queryClient.invalidateQueries({ queryKey: ['applications-for-active'] });
      queryClient.invalidateQueries({ queryKey: ['public-applications'] });
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  if (role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
        <Shield className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="font-display font-bold text-xl text-foreground">Access Denied</h2>
        <p className="text-muted-foreground mt-1">Admin access required</p>
      </div>
    );
  }

  const foundCount = parsedData.filter(p => p.found).length;
  const notFoundCount = parsedData.filter(p => !p.found).length;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/admin')} className="h-8 w-8">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="h-10 w-10 rounded-lg gradient-primary flex items-center justify-center">
          <Activity className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-xl font-display font-bold text-foreground">Active Channel Upload</h1>
          <p className="text-sm text-muted-foreground">
            Upload monthly active ESP/DSF list (channels with at least 1 sale)
          </p>
        </div>
      </div>

      {/* Current Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">Total Approved</span>
            </div>
            <p className="text-2xl font-bold">{activeStats.totalApproved}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <span className="text-xs text-muted-foreground">Active</span>
            </div>
            <p className="text-2xl font-bold text-green-600">{activeStats.currentlyActive}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-blue-500" />
              <span className="text-xs text-muted-foreground">ESP Active</span>
            </div>
            <p className="text-2xl font-bold">{activeStats.espActive} <span className="text-xs text-muted-foreground">/ {activeStats.esp.length}</span></p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-purple-500" />
              <span className="text-xs text-muted-foreground">DSF Active</span>
            </div>
            <p className="text-2xl font-bold">{activeStats.dsfActive} <span className="text-xs text-muted-foreground">/ {activeStats.dsf.length}</span></p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">ESP Performance</span>
            </div>
            <p className="text-2xl font-bold">{activeStats.esp.length > 0 ? Math.round((activeStats.espActive / activeStats.esp.length) * 100) : 0}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-purple-500" />
              <span className="text-xs text-muted-foreground">DSF Performance</span>
            </div>
            <p className="text-2xl font-bold">{activeStats.dsf.length > 0 ? Math.round((activeStats.dsfActive / activeStats.dsf.length) * 100) : 0}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Upload Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upload Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Upload Active List
            </CardTitle>
            <CardDescription>
              Upload CSV file containing active channels (sold at least 1 set this month)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Active Month selector */}
            <div className="space-y-2">
              <Label htmlFor="activeMonth" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Active Month
              </Label>
              <Input
                id="activeMonth"
                type="month"
                value={activeMonth}
                onChange={(e) => setActiveMonth(e.target.value)}
              />
            </div>

            {/* File upload */}
            <div className="space-y-2">
              <Label>Upload CSV</Label>
              <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                <Input
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="hidden"
                  id="csv-upload"
                  disabled={appsLoading}
                />
                <label htmlFor="csv-upload" className="cursor-pointer">
                  <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm font-medium">
                    {file ? file.name : 'Click to upload CSV'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {appsLoading ? 'Loading applications...' : 'Supports .csv files'}
                  </p>
                </label>
              </div>
            </div>

            {/* Template download */}
            <Button variant="outline" size="sm" onClick={downloadTemplate} className="w-full gap-2">
              <Download className="h-4 w-4" />
              Download Template
            </Button>
          </CardContent>
        </Card>

        {/* Instructions Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FileText className="h-4 w-4" />
              CSV Format Instructions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="space-y-2">
              <p className="font-medium">Required Columns:</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li><code className="bg-muted px-1 rounded">identifier</code> - Trading name, D-number, or email</li>
                <li><code className="bg-muted px-1 rounded">identifier_type</code> - One of: trading_name, d_number, email</li>
              </ul>
            </div>
            <div className="space-y-2">
              <p className="font-medium">Matching Logic:</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li><strong>trading_name:</strong> Matches channel trading name (partial match supported)</li>
                <li><strong>d_number:</strong> Matches DSF D-Number exactly</li>
                <li><strong>email:</strong> Matches primary or secondary email</li>
              </ul>
            </div>
            <div className="p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
              <p className="text-amber-700 dark:text-amber-400 text-xs">
                <AlertCircle className="h-4 w-4 inline mr-1" />
                Only approved applications can be marked as active. Upload monthly to track performance.
              </p>
            </div>
          </CardContent>
          <CardFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (window.confirm('Reset ALL channels to inactive? This will mark everyone as inactive.')) {
                  resetAllMutation.mutate();
                }
              }}
              className="w-full gap-2 text-destructive border-destructive/50"
              disabled={resetAllMutation.isPending}
            >
              <RefreshCw className={`h-4 w-4 ${resetAllMutation.isPending ? 'animate-spin' : ''}`} />
              Reset All to Inactive
            </Button>
          </CardFooter>
        </Card>
      </div>

      {/* Preview Table */}
      {parsedData.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-medium">Preview</CardTitle>
                <CardDescription>
                  {foundCount} matched, {notFoundCount} not found
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-green-500/10 text-green-600">{foundCount} Found</Badge>
                <Badge className="bg-red-500/10 text-red-600">{notFoundCount} Not Found</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {processActiveMutation.isPending && (
              <div className="mb-4">
                <Progress value={uploadProgress} className="h-2" />
                <p className="text-xs text-muted-foreground mt-1 text-center">
                  Processing... {uploadProgress}%
                </p>
              </div>
            )}
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Identifier</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Matched Channel</TableHead>
                    <TableHead>Channel</TableHead>
                    <TableHead>Current Status</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedData.map((row, idx) => (
                    <TableRow key={idx} className={!row.found ? 'bg-red-500/5' : ''}>
                      <TableCell className="font-mono text-xs">{row.identifier}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">{row.identifierType}</Badge>
                      </TableCell>
                      <TableCell>{row.channelName || '-'}</TableCell>
                      <TableCell>
                        {row.channel && (
                          <Badge variant={row.channel === 'DSF' ? 'secondary' : 'default'} className="text-xs">
                            {row.channel}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {row.found && (
                          <Badge 
                            variant={row.currentStatus ? 'default' : 'secondary'} 
                            className={row.currentStatus ? 'bg-green-500/10 text-green-600' : ''}
                          >
                            {row.currentStatus ? 'Active' : 'Inactive'}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {row.found ? (
                          <Badge className="bg-green-500/10 text-green-600 gap-1">
                            <Check className="h-3 w-3" /> Found
                          </Badge>
                        ) : (
                          <Badge className="bg-red-500/10 text-red-600 gap-1">
                            <X className="h-3 w-3" /> Not Found
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button 
              variant="outline" 
              onClick={() => {
                setParsedData([]);
                setFile(null);
              }}
            >
              Clear
            </Button>
            <Button
              onClick={() => processActiveMutation.mutate()}
              disabled={foundCount === 0 || processActiveMutation.isPending}
              className="gap-2"
            >
              {processActiveMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  Mark {foundCount} as Active
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
