import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { Shield, Upload, Download, FileSpreadsheet, CheckCircle, XCircle, AlertCircle, ArrowLeft, Trash2 } from 'lucide-react';

interface ImportRow {
  trading_name: string;
  contact_person_name: string;
  contact_person_surname: string;
  email1: string;
  telephone_cell: string;
  channel: 'ESP' | 'DSF';
  channel_types: string;
  zone_name: string;
  territory_name: string;
  status: string;
  physical_address?: string;
  registration_number?: string;
  vat_number?: string;
  fss_user?: string;
  dsf_d_number?: string;
  // Validation result
  _valid?: boolean;
  _errors?: string[];
  _zone_id?: string;
  _territory_id?: string;
}

// CSV Template columns
const TEMPLATE_HEADERS = [
  'trading_name',
  'contact_person_name', 
  'contact_person_surname',
  'email1',
  'telephone_cell',
  'channel',
  'channel_types',
  'zone_name',
  'territory_name',
  'status',
  'physical_address',
  'registration_number',
  'vat_number',
  'fss_user',
  'dsf_d_number'
];

const TEMPLATE_EXAMPLE = [
  'ABC Trading',
  'John',
  'Doe',
  'john@example.com',
  '+255712345678',
  'ESP',
  'Agent,Distributor',
  'COAST',
  'Dar es Salaam',
  'approved',
  '123 Main Street, Dar es Salaam',
  'REG123456',
  'VAT789012',
  'false',
  ''
];

const DSF_EXAMPLE = [
  'Jane Sales Rep',
  'Jane',
  'Smith',
  'jane@example.com',
  '+255787654321',
  'DSF',
  'DSR',
  'LAKE',
  'Mwanza',
  'approved',
  '456 Lake Road, Mwanza',
  '',
  '',
  'true',
  'D12345'
];

export default function GlobalImport() {
  const { role } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [parsedData, setParsedData] = useState<ImportRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [importResults, setImportResults] = useState<{ success: number; failed: number }>({ success: 0, failed: 0 });

  // Fetch zones and territories for validation
  const { data: zones = [] } = useQuery({
    queryKey: ['zones'],
    queryFn: async () => {
      const { data } = await supabase.from('zones').select('*');
      return data ?? [];
    },
  });

  const { data: territories = [] } = useQuery({
    queryKey: ['territories'],
    queryFn: async () => {
      const { data } = await supabase.from('territories').select('*, zones(name)');
      return data ?? [];
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

  // Download CSV template
  const downloadTemplate = () => {
    const csvContent = [
      TEMPLATE_HEADERS.join(','),
      TEMPLATE_EXAMPLE.map(v => `"${v}"`).join(','),
      DSF_EXAMPLE.map(v => `"${v}"`).join(',')
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'channel_import_template.csv';
    link.click();
    URL.revokeObjectURL(link.href);
    toast.success('Template downloaded');
  };

  // Parse CSV file
  const parseCSV = (text: string): ImportRow[] => {
    const lines = text.split(/\r?\n/).filter(line => line.trim());
    if (lines.length < 2) return [];

    // Parse header (first line)
    const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().trim());
    
    // Parse data rows
    const rows: ImportRow[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      if (values.length === 0 || values.every(v => !v.trim())) continue;

      const row: Record<string, string> = {};
      headers.forEach((header, idx) => {
        row[header] = values[idx]?.trim() || '';
      });

      rows.push({
        trading_name: row.trading_name || '',
        contact_person_name: row.contact_person_name || '',
        contact_person_surname: row.contact_person_surname || '',
        email1: row.email1 || '',
        telephone_cell: row.telephone_cell || '',
        channel: (row.channel?.toUpperCase() === 'DSF' ? 'DSF' : 'ESP') as 'ESP' | 'DSF',
        channel_types: row.channel_types || '',
        zone_name: row.zone_name || '',
        territory_name: row.territory_name || '',
        status: row.status || 'approved',
        physical_address: row.physical_address || '',
        registration_number: row.registration_number || '',
        vat_number: row.vat_number || '',
        fss_user: row.fss_user || 'false',
        dsf_d_number: row.dsf_d_number || '',
      });
    }

    return rows;
  };

  // Parse a single CSV line handling quoted values
  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current);
    
    return result;
  };

  // Validate parsed data
  const validateData = (rows: ImportRow[]): ImportRow[] => {
    return rows.map(row => {
      const errors: string[] = [];
      let zone_id: string | undefined;
      let territory_id: string | undefined;

      // Required fields
      if (!row.trading_name) errors.push('Trading name is required');
      if (!row.contact_person_name) errors.push('Contact person name is required');
      if (!row.contact_person_surname) errors.push('Contact person surname is required');
      if (!row.email1) errors.push('Email is required');
      if (!row.telephone_cell) errors.push('Phone number is required');
      if (!row.channel) errors.push('Channel (ESP/DSF) is required');

      // Email validation
      if (row.email1 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email1)) {
        errors.push('Invalid email format');
      }

      // Find zone
      if (row.zone_name) {
        const zone = zones.find(z => 
          z.name.toLowerCase() === row.zone_name.toLowerCase()
        );
        if (zone) {
          zone_id = zone.id;
        } else {
          errors.push(`Zone "${row.zone_name}" not found`);
        }
      }

      // Find territory
      if (row.territory_name) {
        const territory = territories.find(t => 
          t.name.toLowerCase() === row.territory_name.toLowerCase()
        );
        if (territory) {
          territory_id = territory.id;
          // If zone wasn't specified but territory was found, use territory's zone
          if (!zone_id && territory.zone_id) {
            zone_id = territory.zone_id;
          }
        } else {
          errors.push(`Territory "${row.territory_name}" not found`);
        }
      }

      // Validate status
      const validStatuses = ['pending', 'in_progress', 'approved', 'rejected'];
      if (row.status && !validStatuses.includes(row.status.toLowerCase())) {
        errors.push(`Invalid status. Use: ${validStatuses.join(', ')}`);
      }

      return {
        ...row,
        status: row.status?.toLowerCase() || 'approved',
        _valid: errors.length === 0,
        _errors: errors,
        _zone_id: zone_id,
        _territory_id: territory_id,
      };
    });
  };

  // Handle file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file type
    const validTypes = ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
    const isCSV = file.name.endsWith('.csv') || validTypes.includes(file.type);
    
    if (!isCSV) {
      toast.error('Please upload a CSV file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const parsed = parseCSV(text);
      const validated = validateData(parsed);
      setParsedData(validated);
      setImportResults({ success: 0, failed: 0 });
      
      const validCount = validated.filter(r => r._valid).length;
      toast.info(`Parsed ${validated.length} rows (${validCount} valid)`);
    };
    reader.readAsText(file);
  };

  // Import data to Supabase
  const importData = async () => {
    const validRows = parsedData.filter(r => r._valid);
    if (validRows.length === 0) {
      toast.error('No valid rows to import');
      return;
    }

    setImporting(true);
    setProgress(0);
    let success = 0;
    let failed = 0;

    for (let i = 0; i < validRows.length; i++) {
      const row = validRows[i];
      
      try {
        const insertData = {
          trading_name: row.trading_name,
          contact_person_name: row.contact_person_name,
          contact_person_surname: row.contact_person_surname,
          email1: row.email1,
          telephone_cell: row.telephone_cell,
          channel: row.channel,
          channel_types: row.channel_types ? row.channel_types.split(',').map(s => s.trim()) : [],
          zone_id: row._zone_id || null,
          territory_id: row._territory_id || null,
          status: row.status || 'approved',
          physical_address: row.physical_address || null,
          registration_number: row.registration_number || null,
          vat_number: row.vat_number || null,
          fss_user: row.fss_user?.toLowerCase() === 'true',
          dsf_fss_user: row.fss_user?.toLowerCase() === 'true',
          dsf_d_number: row.dsf_d_number || null,
          source: 'import', // Mark as imported/migrated - does not count toward recruitment targets
        };

        const { error } = await supabase.from('applications').insert(insertData);
        
        if (error) {
          console.error('Insert error:', error);
          failed++;
        } else {
          success++;
        }
      } catch (err) {
        console.error('Import error:', err);
        failed++;
      }

      setProgress(Math.round(((i + 1) / validRows.length) * 100));
    }

    setImporting(false);
    setImportResults({ success, failed });
    
    if (success > 0) {
      queryClient.invalidateQueries({ queryKey: ['admin-applications'] });
      queryClient.invalidateQueries({ queryKey: ['admin-applications-full'] });
      toast.success(`Imported ${success} records successfully${failed > 0 ? `, ${failed} failed` : ''}`);
    } else {
      toast.error(`Import failed: ${failed} errors`);
    }
  };

  const clearData = () => {
    setParsedData([]);
    setImportResults({ success: 0, failed: 0 });
    setProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const validCount = parsedData.filter(r => r._valid).length;
  const invalidCount = parsedData.filter(r => !r._valid).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/admin')} className="h-8 w-8">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="h-10 w-10 rounded-lg gradient-primary flex items-center justify-center">
          <FileSpreadsheet className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-xl font-display font-bold text-foreground">Global Import</h1>
          <p className="text-sm text-muted-foreground">Bulk import ESP/DSF channel partners</p>
        </div>
      </div>

      {/* Instructions & Template */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Download className="h-4 w-4" /> Download Template
          </CardTitle>
          <CardDescription>
            Download the CSV template with the correct format for importing channel partners
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-muted/50 rounded-lg text-sm space-y-2">
            <p className="font-medium">Required columns:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1">
              <li><code className="text-xs bg-background px-1 rounded">trading_name</code> - Business/DSR name</li>
              <li><code className="text-xs bg-background px-1 rounded">contact_person_name</code> - First name</li>
              <li><code className="text-xs bg-background px-1 rounded">contact_person_surname</code> - Last name</li>
              <li><code className="text-xs bg-background px-1 rounded">email1</code> - Primary email</li>
              <li><code className="text-xs bg-background px-1 rounded">telephone_cell</code> - Phone number</li>
              <li><code className="text-xs bg-background px-1 rounded">channel</code> - <Badge variant="outline">ESP</Badge> or <Badge variant="outline">DSF</Badge></li>
            </ul>
            <p className="font-medium mt-3">Optional columns:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1">
              <li><code className="text-xs bg-background px-1 rounded">channel_types</code> - Agent, Distributor, Corporate, Retail (comma-separated) or DSR, Point DSR for DSF</li>
              <li><code className="text-xs bg-background px-1 rounded">zone_name</code> - Zone name (must match existing zone)</li>
              <li><code className="text-xs bg-background px-1 rounded">territory_name</code> - Territory name (must match existing territory)</li>
              <li><code className="text-xs bg-background px-1 rounded">status</code> - pending, in_progress, approved, rejected (default: approved)</li>
              <li><code className="text-xs bg-background px-1 rounded">physical_address</code> - Address</li>
              <li><code className="text-xs bg-background px-1 rounded">registration_number</code> - Business registration (ESP only)</li>
              <li><code className="text-xs bg-background px-1 rounded">vat_number</code> - VAT number</li>
              <li><code className="text-xs bg-background px-1 rounded">fss_user</code> - true/false for FSS user</li>
              <li><code className="text-xs bg-background px-1 rounded">dsf_d_number</code> - D-Number for DSF</li>
            </ul>
          </div>
          <Button onClick={downloadTemplate} variant="outline" className="gap-2">
            <Download className="h-4 w-4" /> Download CSV Template
          </Button>
        </CardContent>
      </Card>

      {/* File Upload */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Upload className="h-4 w-4" /> Upload File
          </CardTitle>
          <CardDescription>
            Upload your CSV file with channel partner data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileUpload}
              className="max-w-md"
            />
            {parsedData.length > 0 && (
              <Button variant="outline" size="icon" onClick={clearData}>
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>

          {parsedData.length > 0 && (
            <div className="flex items-center gap-4 text-sm">
              <Badge variant="secondary" className="gap-1">
                <FileSpreadsheet className="h-3 w-3" /> {parsedData.length} rows
              </Badge>
              <Badge variant="default" className="gap-1 bg-success">
                <CheckCircle className="h-3 w-3" /> {validCount} valid
              </Badge>
              {invalidCount > 0 && (
                <Badge variant="destructive" className="gap-1">
                  <XCircle className="h-3 w-3" /> {invalidCount} invalid
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview Data */}
      {parsedData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center justify-between">
              <span className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4" /> Preview Data
              </span>
              <div className="flex items-center gap-2">
                {importing && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>Importing...</span>
                    <span>{progress}%</span>
                  </div>
                )}
                <Button 
                  onClick={importData} 
                  disabled={validCount === 0 || importing}
                  className="gap-2"
                >
                  <Upload className="h-4 w-4" />
                  Import {validCount} Valid Records
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {importing && (
              <Progress value={progress} className="mb-4" />
            )}

            {importResults.success > 0 && (
              <div className="mb-4 p-3 bg-success/10 text-success rounded-lg flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Successfully imported {importResults.success} records
                {importResults.failed > 0 && `, ${importResults.failed} failed`}
              </div>
            )}

            <ScrollArea className="h-[400px] rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">Status</TableHead>
                    <TableHead>Trading Name</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Channel</TableHead>
                    <TableHead>Zone</TableHead>
                    <TableHead>Territory</TableHead>
                    <TableHead>Import Status</TableHead>
                    <TableHead>Errors</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedData.map((row, idx) => (
                    <TableRow key={idx} className={row._valid ? '' : 'bg-destructive/5'}>
                      <TableCell>
                        {row._valid ? (
                          <CheckCircle className="h-4 w-4 text-success" />
                        ) : (
                          <XCircle className="h-4 w-4 text-destructive" />
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{row.trading_name}</TableCell>
                      <TableCell>{row.contact_person_name} {row.contact_person_surname}</TableCell>
                      <TableCell className="text-xs">{row.email1}</TableCell>
                      <TableCell>
                        <Badge variant={row.channel === 'DSF' ? 'secondary' : 'default'}>
                          {row.channel}
                        </Badge>
                      </TableCell>
                      <TableCell>{row.zone_name || '-'}</TableCell>
                      <TableCell>{row.territory_name || '-'}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{row.status}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-destructive max-w-[200px]">
                        {row._errors?.join(', ')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Available Zones & Territories Reference */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Available Zones</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1">
              {zones.map(zone => (
                <Badge key={zone.id} variant="outline" className="text-xs">
                  {zone.name}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Available Territories</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[100px]">
              <div className="flex flex-wrap gap-1">
                {territories.map(t => (
                  <Badge key={t.id} variant="outline" className="text-xs">
                    {t.name}
                  </Badge>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
