import { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { FileText, ChevronLeft, ChevronRight, Upload, X, Check, PenTool, Shield, ArrowLeft } from 'lucide-react';
import SignatureCanvas from 'react-signature-canvas';

// Business positions for dropdown
const BUSINESS_POSITIONS = [
  'Director',
  'Managing Director',
  'CEO (Chief Executive Officer)',
  'CFO (Chief Financial Officer)',
  'COO (Chief Operating Officer)',
  'Manager',
  'General Manager',
  'Operations Manager',
  'Sales Manager',
  'Owner',
  'Proprietor',
  'Partner',
  'Business Partner',
  'Administrator',
  'Secretary',
  'Accountant',
  'Supervisor',
  'Coordinator',
  'Other'
];

// Constants for regions and districts
const TANZANIA_REGIONS = [
  'Arusha', 'Dar es Salaam', 'Dodoma', 'Geita', 'Iringa', 'Kagera', 'Katavi', 'Kigoma', 
  'Kilimanjaro', 'Lindi', 'Manyara', 'Mara', 'Mbeya', 'Morogoro', 'Mtwara', 'Mwanza', 
  'Njombe', 'Pemba North', 'Pemba South', 'Pwani', 'Rukwa', 'Ruvuma', 'Shinyanga', 
  'Simiyu', 'Singida', 'Songwe', 'Tabora', 'Tanga', 'Zanzibar North', 'Zanzibar South', 'Zanzibar West'
];

// All Tanzania districts by region
const DISTRICTS_BY_REGION: Record<string, string[]> = {
  'Arusha': ['Arusha City', 'Arusha District', 'Karatu', 'Longido', 'Meru', 'Monduli', 'Ngorongoro'],
  'Dar es Salaam': ['Ilala', 'Kigamboni', 'Kinondoni', 'Temeke', 'Ubungo'],
  'Dodoma': ['Bahi', 'Chamwino', 'Chemba', 'Dodoma City', 'Kondoa', 'Kongwa', 'Mpwapwa'],
  'Geita': ['Bukombe', 'Chato', 'Geita', 'Mbogwe', 'Nyang\'hwale'],
  'Iringa': ['Iringa Municipal', 'Iringa District', 'Kilolo', 'Mafinga Town', 'Mufindi'],
  'Kagera': ['Biharamulo', 'Bukoba Municipal', 'Bukoba District', 'Karagwe', 'Kyerwa', 'Missenyi', 'Muleba', 'Ngara'],
  'Katavi': ['Mlele', 'Mpanda Municipal', 'Mpanda District', 'Tanganyika'],
  'Kigoma': ['Buhigwe', 'Kakonko', 'Kasulu Municipal', 'Kasulu District', 'Kibondo', 'Kigoma Municipal', 'Kigoma District', 'Uvinza'],
  'Kilimanjaro': ['Hai', 'Moshi Municipal', 'Moshi District', 'Mwanga', 'Rombo', 'Same', 'Siha'],
  'Lindi': ['Kilwa', 'Lindi Municipal', 'Lindi District', 'Liwale', 'Nachingwea', 'Ruangwa'],
  'Manyara': ['Babati Town', 'Babati District', 'Hanang', 'Kiteto', 'Mbulu', 'Simanjiro'],
  'Mara': ['Bunda', 'Butiama', 'Musoma Municipal', 'Musoma District', 'Rorya', 'Serengeti', 'Tarime'],
  'Mbeya': ['Busokelo', 'Chunya', 'Kyela', 'Mbarali', 'Mbeya City', 'Mbeya District', 'Rungwe'],
  'Morogoro': ['Gairo', 'Kilombero', 'Kilosa', 'Morogoro Municipal', 'Morogoro District', 'Mvomero', 'Ulanga', 'Malinyi', 'Ifakara Town'],
  'Mtwara': ['Masasi Municipal', 'Masasi District', 'Mtwara Municipal', 'Mtwara District', 'Nanyumbu', 'Newala', 'Tandahimba'],
  'Mwanza': ['Ilemela', 'Kwimba', 'Magu', 'Misungwi', 'Nyamagana', 'Sengerema', 'Ukerewe', 'Buchosa'],
  'Njombe': ['Ludewa', 'Makambako Town', 'Makete', 'Njombe Town', 'Njombe District', 'Wanging\'ombe'],
  'Pemba North': ['Micheweni', 'Wete'],
  'Pemba South': ['Chake Chake', 'Mkoani'],
  'Pwani': ['Bagamoyo', 'Chalinze', 'Kibaha Town', 'Kibaha District', 'Kisarawe', 'Mafia', 'Mkuranga', 'Rufiji'],
  'Rukwa': ['Kalambo', 'Nkasi', 'Sumbawanga Municipal', 'Sumbawanga District'],
  'Ruvuma': ['Mbinga', 'Madaba', 'Namtumbo', 'Nyasa', 'Songea Municipal', 'Songea District', 'Tunduru'],
  'Shinyanga': ['Kahama Town', 'Kahama District', 'Kishapu', 'Shinyanga Municipal', 'Shinyanga District', 'Ushetu'],
  'Simiyu': ['Bariadi', 'Busega', 'Itilima', 'Maswa', 'Meatu'],
  'Singida': ['Ikungi', 'Iramba', 'Manyoni', 'Mkalama', 'Singida Municipal', 'Singida District'],
  'Songwe': ['Ileje', 'Mbozi', 'Momba', 'Songwe'],
  'Tabora': ['Igunga', 'Kaliua', 'Nzega', 'Sikonge', 'Tabora Municipal', 'Urambo', 'Uyui'],
  'Tanga': ['Handeni', 'Handeni Town', 'Kilindi', 'Korogwe Town', 'Korogwe District', 'Lushoto', 'Mkinga', 'Muheza', 'Pangani', 'Tanga City'],
  'Zanzibar North': ['Kaskazini A', 'Kaskazini B'],
  'Zanzibar South': ['Kati', 'Kusini'],
  'Zanzibar West': ['Magharibi A', 'Magharibi B', 'Mjini']
};

export default function ApplicationForm() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0);
  const [idFiles, setIdFiles] = useState<File[]>([]);
  const [tinFiles, setTinFiles] = useState<File[]>([]);
  const [otherFiles, setOtherFiles] = useState<File[]>([]);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [form, setForm] = useState({
    // Business Details
    trading_name: '',
    registration_number: '',
    tax_id: '',
    business_physical_address: '',
    business_postal_address: '',
    business_telephone: '',
    business_email: '',
    business_mobile: '',
    
    // Business Representative
    rep_title: '',
    rep_first_name: '',
    rep_surname: '',
    rep_id_number: '',
    rep_position: '',
    rep_work_telephone: '',
    rep_mobile: '',
    rep_email: '',
    rep_alternative_email: '',
    rep_physical_address: '',
    rep_postal_address: '',
    
    // Location Details
    region: '',
    district: '',
    ward: '',
    street: '',
    postal_code: '',
    zone_id: '',
    territory_id: '',
    
    // Sales Channel Type
    channel_type_agent: false,
    channel_type_distributor: false,
    channel_type_sub_distributor: false,
    channel_type_retailer: false,
    channel_type_other: false,
    channel_type_other_text: '',
    
    // Declaration of Interest (multiple selections allowed)
    declaration_no_conflict: false,
    declaration_has_conflict: false,
    declaration_will_disclose: false,
    conflict_nature: '',
    
    // Signature
    signature_data: '',
    signature_date: new Date().toISOString().split('T')[0],
    signed_at_location: '',
    witness1_name: '',
    witness2_name: '',
    
    // Terms Acceptance
    terms_accepted: false,
  });

  const signatureRef = useRef<SignatureCanvas>(null);

  const { data: zones = [] } = useQuery({
    queryKey: ['zones'],
    queryFn: async () => {
      const { data } = await supabase.from('zones').select('*').order('name');
      return data ?? [];
    },
  });

  const { data: territories = [] } = useQuery({
    queryKey: ['territories-by-zone', form.zone_id],
    queryFn: async () => {
      let q = supabase.from('territories').select('*').order('name');
      if (form.zone_id) q = q.eq('zone_id', form.zone_id);
      const { data } = await q;
      return data ?? [];
    },
    enabled: true,
  });

  const update = (field: string, value: string | boolean) => setForm(f => ({ ...f, [field]: value }));

  const clearSignature = () => {
    signatureRef.current?.clear();
    update('signature_data', '');
  };

  const saveSignature = () => {
    if (signatureRef.current && !signatureRef.current.isEmpty()) {
      const signatureData = signatureRef.current.toDataURL();
      update('signature_data', signatureData);
      toast.success('Signature saved');
    } else {
      toast.error('Please provide your signature');
    }
  };

  const handleFileAdd = (e: React.ChangeEvent<HTMLInputElement>, fileType: 'id' | 'tin' | 'other' | 'photo') => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      switch (fileType) {
        case 'id':
          setIdFiles(prev => [...prev, ...newFiles]);
          break;
        case 'tin':
          setTinFiles(prev => [...prev, ...newFiles]);
          break;
        case 'other':
          setOtherFiles(prev => [...prev, ...newFiles]);
          break;
        case 'photo':
          setPhotoFiles(prev => [...prev, ...newFiles]);
          break;
      }
    }
  };

  const removeFile = (fileType: 'id' | 'tin' | 'other' | 'photo', idx: number) => {
    switch (fileType) {
      case 'id':
        setIdFiles(prev => prev.filter((_, i) => i !== idx));
        break;
      case 'tin':
        setTinFiles(prev => prev.filter((_, i) => i !== idx));
        break;
      case 'other':
        setOtherFiles(prev => prev.filter((_, i) => i !== idx));
        break;
      case 'photo':
        setPhotoFiles(prev => prev.filter((_, i) => i !== idx));
        break;
    }
  };

  // Calculate progress %
  const getProgress = useCallback(() => {
    const requiredFields = [
      form.trading_name,
      form.rep_first_name,
      form.rep_surname,
      form.rep_mobile,
      form.rep_email,
      form.region,
      form.district,
      form.terms_accepted,
      form.signature_data,
    ];
    
    const filledRequired = requiredFields.filter(Boolean).length;
    return Math.round((filledRequired / requiredFields.length) * 100);
  }, [form]);

  const handleSubmit = async () => {
    if (!user) { 
      toast.error('Please sign in first'); 
      navigate('/login'); 
      return; 
    }

    // Validate required fields
    const requiredFields = [
      { field: form.trading_name, message: 'Trading name is required' },
      { field: form.rep_first_name, message: 'Representative first name is required' },
      { field: form.rep_surname, message: 'Representative surname is required' },
      { field: form.rep_mobile, message: 'Mobile number is required' },
      { field: form.rep_email, message: 'Email is required' },
      { field: form.region, message: 'Region is required' },
      { field: form.district, message: 'District is required' },
      { field: form.terms_accepted, message: 'You must accept the terms and conditions' },
      { field: form.signature_data, message: 'Please provide your signature' },
    ];

    for (const req of requiredFields) {
      if (!req.field) {
        toast.error(req.message);
        return;
      }
    }

    // Ensure at least one channel type is selected
    if (!form.channel_type_agent && !form.channel_type_distributor && 
        !form.channel_type_sub_distributor && !form.channel_type_retailer && !form.channel_type_other) {
      toast.error('Please select at least one sales channel type');
      return;
    }

    setLoading(true);
    try {
      // Build channel_types array from boolean flags
      const channelTypes: string[] = [];
      if (form.channel_type_agent) channelTypes.push('agent');
      if (form.channel_type_distributor) channelTypes.push('distributor');
      if (form.channel_type_sub_distributor) channelTypes.push('sub_distributor');
      if (form.channel_type_retailer) channelTypes.push('retailer');

      const { data: appData, error } = await supabase.from('applications').insert({
        // Business Details
        trading_name: form.trading_name.trim(),
        registration_number: form.registration_number.trim() || null,
        vat_number: form.tax_id.trim() || null,
        physical_address: form.business_physical_address.trim() || null,
        postal_address: form.business_postal_address.trim() || null,
        telephone_work: form.business_telephone.trim() || null,
        
        // Representative Details (mapped to contact_person fields)
        contact_person_name: form.rep_first_name.trim(),
        contact_person_surname: form.rep_surname.trim(),
        designation_capacity: form.rep_position.trim() || null,
        telephone_cell: form.rep_mobile.trim(),
        email1: form.rep_email.trim(),
        email2: form.rep_alternative_email.trim() || null,
        
        // Location
        zone_id: form.zone_id || null,
        territory_id: form.territory_id || null,
        
        // Channel Types (as array)
        channel_types: channelTypes.length > 0 ? channelTypes : null,
        channel_type_other: form.channel_type_other ? form.channel_type_other_text.trim() : null,
        
        // Conflict of Interest (now supports multiple selections)
        conflict_of_interest: form.declaration_has_conflict || form.declaration_will_disclose,
        conflict_details: form.conflict_nature.trim() || null,
        
        // Signature
        signature_text: form.signature_data,
        signed_at_location: form.signed_at_location.trim() || null,
        witness1_name: form.witness1_name.trim() || null,
        witness2_name: form.witness2_name.trim() || null,
        declaration_date: form.signature_date,
        
        // Terms
        credit_check_consent: form.terms_accepted,
        
        // Metadata
        submitted_by: user.id,
        status: 'pending',
      }).select('id').single();

      if (error) throw error;

      // Upload attachments - ID Documents
      if (idFiles.length > 0 && appData) {
        for (const file of idFiles) {
          const filePath = `${appData.id}/id/${Date.now()}_${file.name}`;
          const { error: uploadErr } = await supabase.storage
            .from('application-attachments')
            .upload(filePath, file);
          
          if (!uploadErr) {
            await supabase.from('application_attachments').insert({
              application_id: appData.id,
              file_name: file.name,
              file_path: filePath,
              file_type: file.type,
              uploaded_by: user.id,
            });
          }
        }
      }

      // Upload attachments - TIN Documents
      if (tinFiles.length > 0 && appData) {
        for (const file of tinFiles) {
          const filePath = `${appData.id}/tin/${Date.now()}_${file.name}`;
          const { error: uploadErr } = await supabase.storage
            .from('application-attachments')
            .upload(filePath, file);
          
          if (!uploadErr) {
            await supabase.from('application_attachments').insert({
              application_id: appData.id,
              file_name: file.name,
              file_path: filePath,
              file_type: file.type,
              uploaded_by: user.id,
            });
          }
        }
      }

      // Upload attachments - Other Documents
      if (otherFiles.length > 0 && appData) {
        for (const file of otherFiles) {
          const filePath = `${appData.id}/other/${Date.now()}_${file.name}`;
          const { error: uploadErr } = await supabase.storage
            .from('application-attachments')
            .upload(filePath, file);
          
          if (!uploadErr) {
            await supabase.from('application_attachments').insert({
              application_id: appData.id,
              file_name: file.name,
              file_path: filePath,
              file_type: file.type,
              uploaded_by: user.id,
            });
          }
        }
      }

      // Upload attachments - Outlet/Office Photos
      if (photoFiles.length > 0 && appData) {
        for (const file of photoFiles) {
          const filePath = `${appData.id}/photo/${Date.now()}_${file.name}`;
          const { error: uploadErr } = await supabase.storage
            .from('application-attachments')
            .upload(filePath, file);
          
          if (!uploadErr) {
            await supabase.from('application_attachments').insert({
              application_id: appData.id,
              file_name: file.name,
              file_path: filePath,
              file_type: file.type,
              uploaded_by: user.id,
            });
          }
        }
      }

      toast.success('Application submitted successfully!');
      navigate('/');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit application';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const progress = getProgress();
  const totalSteps = 5;
  const canGoNext = step < totalSteps - 1;
  const canGoPrev = step > 0;

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="h-8 w-8">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="h-14 w-14 rounded-lg gradient-primary flex items-center justify-center">
          <FileText className="h-7 w-7 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">
            Sales Channel Partner Application Form
          </h1>
          <p className="text-sm text-muted-foreground">
            MultiChoice Africa - Complete this form to apply as a sales channel partner
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-8 space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-muted-foreground">
            Step {step + 1} of {totalSteps}: {
              ['Business Details', 'Representative', 'Location', 'Channel & Declaration', 'Signature'][step]
            }
          </span>
          <span className="text-sm font-bold text-primary">{progress}% Complete</span>
        </div>
        <Progress value={progress} className="h-2.5" />
      </div>

      {/* Form content */}
      <div className="rounded-xl border bg-card shadow-card overflow-hidden">
        <div className="bg-muted/50 px-6 py-4 border-b">
          <h2 className="font-display font-semibold text-card-foreground text-lg">
            {['Business Details', 'Business Representative', 'Location Details', 'Channel & Declaration', 'Signature & Witness'][step]}
          </h2>
          <p className="text-sm text-muted-foreground">
            {step === 0 && "Enter your business information"}
            {step === 1 && "Details of the business representative"}
            {step === 2 && "Select your region, district and enter ward/street"}
            {step === 3 && "Select sales channel type and complete declaration"}
            {step === 4 && "Sign and witness the application"}
          </p>
        </div>

        <div className="p-6 space-y-6 min-h-[500px]">
          {/* Step 0: Business Details */}
          {step === 0 && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-primary">BUSINESS DETAILS</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Trading Name *</Label>
                  <Input 
                    value={form.trading_name} 
                    onChange={e => update('trading_name', e.target.value)} 
                    placeholder="Business trading name"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Registration Number</Label>
                  <Input 
                    value={form.registration_number} 
                    onChange={e => update('registration_number', e.target.value)} 
                    placeholder="Company registration number"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Tax ID / VAT Number</Label>
                  <Input 
                    value={form.tax_id} 
                    onChange={e => update('tax_id', e.target.value)} 
                    placeholder="Tax identification number"
                  />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <Label>Business Physical Address</Label>
                  <Textarea 
                    value={form.business_physical_address} 
                    onChange={e => update('business_physical_address', e.target.value)} 
                    rows={2}
                    placeholder="Physical address"
                  />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <Label>Business Postal Address</Label>
                  <Textarea 
                    value={form.business_postal_address} 
                    onChange={e => update('business_postal_address', e.target.value)} 
                    rows={2}
                    placeholder="Postal address (if different)"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Telephone (Work)</Label>
                  <Input 
                    value={form.business_telephone} 
                    onChange={e => update('business_telephone', e.target.value)} 
                    placeholder="Work phone number"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Mobile</Label>
                  <Input 
                    value={form.business_mobile} 
                    onChange={e => update('business_mobile', e.target.value)} 
                    placeholder="Mobile number"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input 
                    type="email" 
                    value={form.business_email} 
                    onChange={e => update('business_email', e.target.value)} 
                    placeholder="Business email"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 1: Business Representative */}
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-primary">BUSINESS REPRESENTATIVE</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Title</Label>
                  <Select value={form.rep_title} onValueChange={v => update('rep_title', v)}>
                    <SelectTrigger><SelectValue placeholder="Select title" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Mr">Mr</SelectItem>
                      <SelectItem value="Mrs">Mrs</SelectItem>
                      <SelectItem value="Ms">Ms</SelectItem>
                      <SelectItem value="Dr">Dr</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>First Name *</Label>
                  <Input 
                    value={form.rep_first_name} 
                    onChange={e => update('rep_first_name', e.target.value)} 
                    placeholder="First name"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Surname *</Label>
                  <Input 
                    value={form.rep_surname} 
                    onChange={e => update('rep_surname', e.target.value)} 
                    placeholder="Surname"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>ID Number</Label>
                  <Input 
                    value={form.rep_id_number} 
                    onChange={e => update('rep_id_number', e.target.value)} 
                    placeholder="National ID / Passport"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Position in Business</Label>
                  <Select value={form.rep_position} onValueChange={v => update('rep_position', v)}>
                    <SelectTrigger><SelectValue placeholder="Select position" /></SelectTrigger>
                    <SelectContent>
                      {BUSINESS_POSITIONS.map(position => (
                        <SelectItem key={position} value={position}>{position}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Work Telephone</Label>
                  <Input 
                    value={form.rep_work_telephone} 
                    onChange={e => update('rep_work_telephone', e.target.value)} 
                    placeholder="Work phone"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Mobile *</Label>
                  <Input 
                    value={form.rep_mobile} 
                    onChange={e => update('rep_mobile', e.target.value)} 
                    placeholder="Mobile number"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Email *</Label>
                  <Input 
                    type="email" 
                    value={form.rep_email} 
                    onChange={e => update('rep_email', e.target.value)} 
                    placeholder="Email address"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Alternative Email</Label>
                  <Input 
                    type="email" 
                    value={form.rep_alternative_email} 
                    onChange={e => update('rep_alternative_email', e.target.value)} 
                    placeholder="Alternative email"
                  />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <Label>Physical Address</Label>
                  <Textarea 
                    value={form.rep_physical_address} 
                    onChange={e => update('rep_physical_address', e.target.value)} 
                    rows={2}
                    placeholder="Physical address"
                  />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <Label>Postal Address</Label>
                  <Textarea 
                    value={form.rep_postal_address} 
                    onChange={e => update('rep_postal_address', e.target.value)} 
                    rows={2}
                    placeholder="Postal address"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Location Details */}
          {step === 2 && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-primary">LOCATION DETAILS</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Region *</Label>
                  <Select value={form.region} onValueChange={v => update('region', v)}>
                    <SelectTrigger><SelectValue placeholder="Select region" /></SelectTrigger>
                    <SelectContent>
                      {TANZANIA_REGIONS.map(region => (
                        <SelectItem key={region} value={region}>{region}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>District *</Label>
                  <Select 
                    value={form.district} 
                    onValueChange={v => update('district', v)}
                    disabled={!form.region}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={form.region ? "Select district" : "Select region first"} />
                    </SelectTrigger>
                    <SelectContent>
                      {form.region && DISTRICTS_BY_REGION[form.region]?.map(district => (
                        <SelectItem key={district} value={district}>{district}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Ward (Enter manually)</Label>
                  <Input 
                    value={form.ward} 
                    onChange={e => update('ward', e.target.value)} 
                    placeholder="Enter ward name"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Street/Village (Enter manually)</Label>
                  <Input 
                    value={form.street} 
                    onChange={e => update('street', e.target.value)} 
                    placeholder="Enter street or village name"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Postal Code</Label>
                  <Input 
                    value={form.postal_code} 
                    onChange={e => update('postal_code', e.target.value)} 
                    placeholder="Enter postal code"
                  />
                </div>
              </div>

              <Separator className="my-4" />
              
              <h4 className="text-sm font-medium">Zone & Territory (Optional)</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Zone</Label>
                  <Select value={form.zone_id} onValueChange={v => { update('zone_id', v); update('territory_id', ''); }}>
                    <SelectTrigger><SelectValue placeholder="Select Zone" /></SelectTrigger>
                    <SelectContent>
                      {zones.map((z) => (
                        <SelectItem key={z.id} value={z.id}>{z.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Territory</Label>
                  <Select value={form.territory_id} onValueChange={v => update('territory_id', v)} disabled={!form.zone_id}>
                    <SelectTrigger>
                      <SelectValue placeholder={form.zone_id ? "Select Territory" : "Select a zone first"} />
                    </SelectTrigger>
                    <SelectContent>
                      {territories.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name} {t.monthly_target && t.monthly_target > 0 && `(Target: ${t.monthly_target})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Channel & Declaration */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-primary mb-3">TYPE OF SALES CHANNEL</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <label className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted cursor-pointer">
                    <Checkbox 
                      checked={form.channel_type_agent} 
                      onCheckedChange={v => update('channel_type_agent', v)} 
                    />
                    <span className="text-sm">Agent</span>
                  </label>
                  <label className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted cursor-pointer">
                    <Checkbox 
                      checked={form.channel_type_distributor} 
                      onCheckedChange={v => update('channel_type_distributor', v)} 
                    />
                    <span className="text-sm">Distributor</span>
                  </label>
                  <label className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted cursor-pointer">
                    <Checkbox 
                      checked={form.channel_type_sub_distributor} 
                      onCheckedChange={v => update('channel_type_sub_distributor', v)} 
                    />
                    <span className="text-sm">Sub-Distributor</span>
                  </label>
                  <label className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted cursor-pointer">
                    <Checkbox 
                      checked={form.channel_type_retailer} 
                      onCheckedChange={v => update('channel_type_retailer', v)} 
                    />
                    <span className="text-sm">Retailer</span>
                  </label>
                  <label className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted cursor-pointer md:col-span-2">
                    <Checkbox 
                      checked={form.channel_type_other} 
                      onCheckedChange={v => update('channel_type_other', v)} 
                    />
                    <span className="text-sm">Other (please specify)</span>
                  </label>
                </div>
                {form.channel_type_other && (
                  <div className="mt-3">
                    <Input 
                      value={form.channel_type_other_text} 
                      onChange={e => update('channel_type_other_text', e.target.value)} 
                      placeholder="Specify other channel type"
                    />
                  </div>
                )}
              </div>

              <Separator />

              <div>
                <h3 className="text-sm font-semibold text-primary mb-3">DECLARATION OF INTEREST</h3>
                <p className="text-xs text-muted-foreground mb-4">
                  PLEASE TICK & COMPLETE THE APPROPRIATE BOX BELOW (You may select all that apply):
                </p>
                
                <div className="space-y-3">
                  <label className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted cursor-pointer">
                    <Checkbox 
                      checked={form.declaration_no_conflict} 
                      onCheckedChange={v => update('declaration_no_conflict', v as boolean)}
                      className="mt-0.5"
                    />
                    <div className="text-sm">
                      I hereby declare that, to the best of my knowledge and belief, there are no relevant facts 
                      or circumstances which could give rise to an organizational or personal conflict of interest 
                      for MultiChoice or any of its employee or customers.
                    </div>
                  </label>
                  
                  <label className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted cursor-pointer">
                    <Checkbox 
                      checked={form.declaration_has_conflict} 
                      onCheckedChange={v => update('declaration_has_conflict', v as boolean)}
                      className="mt-0.5"
                    />
                    <div className="text-sm">
                      I declare that there are relevant facts or circumstances which could give rise to an 
                      organizational or personal conflict of interest for MultiChoice or any of its employee 
                      or customers.
                    </div>
                  </label>

                  <label className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted cursor-pointer">
                    <Checkbox 
                      checked={form.declaration_will_disclose} 
                      onCheckedChange={v => update('declaration_will_disclose', v as boolean)}
                      className="mt-0.5"
                    />
                    <div className="text-sm">
                      I will disclose any interests in a transaction or decision where I, my family and/or my 
                      significant other, or close associates will receive benefit or gain from this application.
                    </div>
                  </label>
                </div>

                {(form.declaration_has_conflict || form.declaration_will_disclose) && (
                  <div className="mt-4 space-y-1.5">
                    <Label>Nature of the interest:</Label>
                    <Textarea 
                      value={form.conflict_nature} 
                      onChange={e => update('conflict_nature', e.target.value)} 
                      rows={3}
                      placeholder="Please describe the nature of the interest"
                    />
                  </div>
                )}
              </div>

              <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
                <Checkbox 
                  id="terms" 
                  checked={form.terms_accepted} 
                  onCheckedChange={v => update('terms_accepted', v)} 
                />
                <Label htmlFor="terms" className="text-sm leading-relaxed">
                  I confirm that I understand the nature of a sales channel partner and that this is an application 
                  only, subject to approval by MultiChoice. I may not act as a sales channel partner without having 
                  received written confirmation from MultiChoice. If approved, my relationship with MultiChoice will 
                  be governed by the terms and conditions on the MultiChoice website.
                </Label>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-primary">Supporting Documents</h3>
                
                {/* ID Document Upload */}
                <div className="space-y-1.5">
                  <Label>1. Upload ID Document</Label>
                  <label className="flex flex-col items-center gap-2 p-4 border-2 border-dashed border-muted-foreground/30 rounded-xl cursor-pointer hover:border-primary/50 transition-colors">
                    <Upload className="h-5 w-5 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Click to upload ID (Passport, National ID, etc.)</span>
                    <input type="file" multiple onChange={e => handleFileAdd(e, 'id')} className="hidden" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" />
                  </label>
                  {idFiles.length > 0 && (
                    <div className="space-y-1 mt-2">
                      {idFiles.map((f, i) => (
                        <div key={i} className="flex items-center justify-between p-2 bg-muted rounded-lg text-sm">
                          <span className="truncate flex-1">{f.name}</span>
                          <button onClick={() => removeFile('id', i)} className="text-destructive ml-2" title="Remove file" aria-label="Remove file">
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* TIN Document Upload */}
                <div className="space-y-1.5">
                  <Label>2. Upload TIN Certificate</Label>
                  <label className="flex flex-col items-center gap-2 p-4 border-2 border-dashed border-muted-foreground/30 rounded-xl cursor-pointer hover:border-primary/50 transition-colors">
                    <Upload className="h-5 w-5 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Click to upload TIN Certificate</span>
                    <input type="file" multiple onChange={e => handleFileAdd(e, 'tin')} className="hidden" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" />
                  </label>
                  {tinFiles.length > 0 && (
                    <div className="space-y-1 mt-2">
                      {tinFiles.map((f, i) => (
                        <div key={i} className="flex items-center justify-between p-2 bg-muted rounded-lg text-sm">
                          <span className="truncate flex-1">{f.name}</span>
                          <button onClick={() => removeFile('tin', i)} className="text-destructive ml-2" title="Remove file" aria-label="Remove file">
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Other Documents Upload */}
                <div className="space-y-1.5">
                  <Label>3. Upload Other Documents (Optional)</Label>
                  <label className="flex flex-col items-center gap-2 p-4 border-2 border-dashed border-muted-foreground/30 rounded-xl cursor-pointer hover:border-primary/50 transition-colors">
                    <Upload className="h-5 w-5 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Click to upload other supporting documents</span>
                    <span className="text-xs text-muted-foreground">(Business registration, licenses, etc.)</span>
                    <input type="file" multiple onChange={e => handleFileAdd(e, 'other')} className="hidden" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" />
                  </label>
                  {otherFiles.length > 0 && (
                    <div className="space-y-1 mt-2">
                      {otherFiles.map((f, i) => (
                        <div key={i} className="flex items-center justify-between p-2 bg-muted rounded-lg text-sm">
                          <span className="truncate flex-1">{f.name}</span>
                          <button onClick={() => removeFile('other', i)} className="text-destructive ml-2" title="Remove file" aria-label="Remove file">
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Outlet/Office Photo Upload */}
                <div className="space-y-1.5">
                  <Label>4. Upload Outlet/Office Photos</Label>
                  <label className="flex flex-col items-center gap-2 p-4 border-2 border-dashed border-muted-foreground/30 rounded-xl cursor-pointer hover:border-primary/50 transition-colors">
                    <Upload className="h-5 w-5 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Click to upload outlet/office photos</span>
                    <span className="text-xs text-muted-foreground">(Add multiple photos if available)</span>
                    <input type="file" multiple onChange={e => handleFileAdd(e, 'photo')} className="hidden" accept=".jpg,.jpeg,.png,.heic,.webp" />
                  </label>
                  {photoFiles.length > 0 && (
                    <div className="space-y-1 mt-2">
                      {photoFiles.map((f, i) => (
                        <div key={i} className="flex items-center justify-between p-2 bg-muted rounded-lg text-sm">
                          <span className="truncate flex-1">{f.name}</span>
                          <button onClick={() => removeFile('photo', i)} className="text-destructive ml-2" title="Remove file" aria-label="Remove file">
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Signature & Witness */}
          {step === 4 && (
            <div className="space-y-6">
              <div className="rounded-lg bg-primary/5 p-4 text-sm border border-primary/20">
                <p className="font-medium text-primary mb-2">FOR INTERNAL USE</p>
                <p className="text-muted-foreground">
                  Processed on: ____________________
                  <br />
                  By Name of Sales Representative: ____________________
                </p>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-primary mb-3">SIGNATURE</h3>
                <div className="space-y-4">
                  <div className="border rounded-lg p-4 bg-white">
                    <SignatureCanvas
                      ref={signatureRef}
                      canvasProps={{
                        className: 'w-full h-32 border rounded cursor-crosshair',
                      }}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={clearSignature}>
                      Clear Signature
                    </Button>
                    <Button variant="default" size="sm" onClick={saveSignature} className="gap-2">
                      <PenTool className="h-4 w-4" /> Save Signature
                    </Button>
                  </div>
                  {form.signature_data && (
                    <div className="flex items-center gap-2 text-sm text-success">
                      <Check className="h-4 w-4" /> Signature saved
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Date</Label>
                  <Input 
                    type="date" 
                    value={form.signature_date} 
                    onChange={e => update('signature_date', e.target.value)} 
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Signed at (Location)</Label>
                  <Select value={form.signed_at_location} onValueChange={v => update('signed_at_location', v)}>
                    <SelectTrigger><SelectValue placeholder="Select location" /></SelectTrigger>
                    <SelectContent>
                      {TANZANIA_REGIONS.map(region => (
                        <SelectItem key={region} value={region}>{region} (Region)</SelectItem>
                      ))}
                      {Object.entries(DISTRICTS_BY_REGION).flatMap(([region, districts]) =>
                        districts.map(district => (
                          <SelectItem key={`${region}-${district}`} value={`${district}, ${region}`}>
                            {district}, {region}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Witness 1 Name</Label>
                  <Input 
                    value={form.witness1_name} 
                    onChange={e => update('witness1_name', e.target.value)} 
                    placeholder="Full name of witness"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Witness 2 Name</Label>
                  <Input 
                    value={form.witness2_name} 
                    onChange={e => update('witness2_name', e.target.value)} 
                    placeholder="Full name of witness"
                  />
                </div>
              </div>

              <div className="rounded-lg bg-warning/5 p-4 border border-warning/20">
                <p className="text-sm text-warning-foreground">
                  <Shield className="h-4 w-4 inline mr-2" />
                  By signing above, you confirm that all information provided is correct and complete. 
                  MultiChoice may take legal action if any information is found false or misleading.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="border-t bg-muted/30 px-6 py-4 flex items-center justify-between">
          <Button 
            variant="outline" 
            size="default" 
            disabled={!canGoPrev} 
            onClick={() => setStep(s => s - 1)}
            className="gap-2"
          >
            <ChevronLeft className="h-4 w-4" /> Back
          </Button>
          
          <div className="text-sm text-muted-foreground">
            {step + 1} / {totalSteps}
          </div>
          
          {canGoNext ? (
            <Button size="default" onClick={() => setStep(s => s + 1)} className="gap-2">
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button 
              size="default" 
              onClick={handleSubmit} 
              disabled={loading || !form.signature_data || !form.terms_accepted} 
              className="gap-2 bg-success hover:bg-success/90"
            >
              {loading ? (
                <>Submitting...</>
              ) : (
                <>
                  <Check className="h-4 w-4" /> Submit Application
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      <p className="text-xs text-muted-foreground text-center mt-4">
        Fields marked with * are required. This application is subject to approval by MultiChoice.
      </p>
    </div>
  );
}

// Note: You'll need to install react-signature-canvas
// npm install react-signature-canvas @types/react-signature-canvas