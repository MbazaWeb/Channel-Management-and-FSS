import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// MultiChoice Africa logo cache
let logoDataUrl: string | null = null;

// Preload logo for PDF export
async function loadLogo(): Promise<string | null> {
  if (logoDataUrl) return logoDataUrl;
  try {
    const response = await fetch('/favicon.ico');
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        logoDataUrl = reader.result as string;
        resolve(logoDataUrl);
      };
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

interface Attachment {
  id: string;
  file_name: string;
  file_path: string;
  file_type?: string | null;
}

interface ApplicationData {
  trading_name: string;
  registration_number?: string | null;
  citizenship?: string | null;
  vat_number?: string | null;
  contact_person_name: string;
  contact_person_surname: string;
  date_of_birth?: string | null;
  gender?: string | null;
  credit_check_consent?: boolean | null;
  telephone_work?: string | null;
  telephone_cell: string;
  email1: string;
  email2?: string | null;
  physical_address?: string | null;
  postal_address?: string | null;
  customer_number?: string | null;
  authority_to_transact?: string | null;
  designation_capacity?: string | null;
  channel_types?: string[] | null;
  channel_type_other?: string | null;
  responsibilities?: string[] | null;
  conflict_of_interest?: boolean | null;
  conflict_details?: string | null;
  signature_text?: string | null;
  declaration_date?: string | null;
  signed_at_location?: string | null;
  witness1_name?: string | null;
  witness2_name?: string | null;
  status: string;
  created_at: string;
  territory_name?: string;
  zone_name?: string;
  attachments?: Attachment[];
}

export async function exportApplicationPdf(app: ApplicationData) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const logo = await loadLogo();

  // Header with MultiChoice branding
  doc.setFillColor(0, 51, 102);
  doc.rect(0, 0, pageWidth, 35, 'F');
  
  // Add logo if available
  if (logo) {
    try {
      doc.addImage(logo, 'PNG', 14, 5, 25, 25);
    } catch {
      // Skip logo if it fails
    }
  }
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('MultiChoice Africa', logo ? 45 : 14, 15);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text('Sales Channel Partner Application', logo ? 45 : 14, 23);
  doc.setFontSize(9);
  doc.text(`Status: ${app.status.toUpperCase()}`, pageWidth - 14, 20, { align: 'right' });

  doc.setTextColor(0, 0, 0);
  let y = 45;

  const addSection = (title: string) => {
    if (y > 260) { doc.addPage(); y = 20; }
    doc.setFillColor(240, 245, 250);
    doc.rect(14, y - 5, pageWidth - 28, 8, 'F');
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(title, 16, y);
    y += 8;
  };

  const addRow = (label: string, value: string | null | undefined) => {
    if (y > 275) { doc.addPage(); y = 20; }
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(label, 16, y);
    doc.setTextColor(0, 0, 0);
    doc.text(value || '—', 80, y);
    y += 6;
  };

  // Business Details
  addSection('BUSINESS DETAILS');
  addRow('Trading Name', app.trading_name);
  addRow('Registration No', app.registration_number);
  addRow('Citizenship', app.citizenship);
  addRow('VAT Number', app.vat_number);
  addRow('Contact Name', `${app.contact_person_name} ${app.contact_person_surname}`);
  addRow('Date of Birth', app.date_of_birth);
  addRow('Gender', app.gender);
  addRow('Credit Check', app.credit_check_consent ? 'Yes' : 'No');

  y += 4;
  addSection('BUSINESS REPRESENTATIVE');
  addRow('Tel (Work)', app.telephone_work);
  addRow('Tel (Cell)', app.telephone_cell);
  addRow('Email', app.email1);
  addRow('Email 2', app.email2);
  addRow('Physical Address', app.physical_address);
  addRow('Postal Address', app.postal_address);
  addRow('Customer No', app.customer_number);
  addRow('Authority', app.authority_to_transact);
  addRow('Designation', app.designation_capacity);

  y += 4;
  addSection('ZONE & TERRITORY');
  addRow('Zone', app.zone_name);
  addRow('Territory', app.territory_name);

  y += 4;
  addSection('SALES CHANNEL TYPE');
  addRow('Types', app.channel_types?.join(', '));
  if (app.channel_type_other) addRow('Other', app.channel_type_other);

  y += 4;
  addSection('RESPONSIBILITIES');
  addRow('Duties', app.responsibilities?.join(', '));

  y += 4;
  addSection('DECLARATION');
  addRow('Conflict of Interest', app.conflict_of_interest ? 'Yes' : 'No');
  if (app.conflict_details) addRow('Details', app.conflict_details);
  addRow('Signature', app.signature_text);
  addRow('Signed at', app.signed_at_location);
  addRow('Date', app.declaration_date);
  addRow('Witness 1', app.witness1_name);
  addRow('Witness 2', app.witness2_name);

  // Attachments Section
  if (app.attachments && app.attachments.length > 0) {
    y += 4;
    addSection('ATTACHMENTS');
    
    // Group attachments by file_type
    const groupedAttachments = app.attachments.reduce((acc, att) => {
      const fileType = att.file_type || 'Other Documents';
      if (!acc[fileType]) acc[fileType] = [];
      acc[fileType].push(att);
      return acc;
    }, {} as Record<string, Attachment[]>);

    Object.entries(groupedAttachments).forEach(([category, files]) => {
      if (y > 275) { doc.addPage(); y = 20; }
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 51, 102);
      doc.text(category, 16, y);
      y += 5;
      
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      files.forEach((file) => {
        if (y > 275) { doc.addPage(); y = 20; }
        doc.setFontSize(8);
        doc.text(`• ${file.file_name}`, 20, y);
        y += 4;
      });
      y += 2;
    });
  }

  // Footer
  y += 10;
  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150);
  doc.text(`Generated on ${new Date().toLocaleDateString()} • Application submitted ${new Date(app.created_at).toLocaleDateString()}`, 14, y);

  doc.save(`application-${app.trading_name.replace(/\s+/g, '_')}.pdf`);
}

export async function exportApplicationsListPdf(apps: ApplicationData[]) {
  const doc = new jsPDF('landscape');
  const pageWidth = doc.internal.pageSize.getWidth();
  const logo = await loadLogo();

  // Header with MultiChoice branding
  doc.setFillColor(0, 51, 102);
  doc.rect(0, 0, pageWidth, 30, 'F');
  
  // Add logo if available
  if (logo) {
    try {
      doc.addImage(logo, 'PNG', 14, 4, 22, 22);
    } catch {
      // Skip logo if it fails
    }
  }
  
  doc.setTextColor(255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('MultiChoice Africa', logo ? 42 : 14, 13);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text('Applications Report', logo ? 42 : 14, 21);
  doc.setFontSize(9);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth - 14, 16, { align: 'right' });

  autoTable(doc, {
    startY: 35,
    head: [['Trading Name', 'Contact Person', 'Email', 'Phone', 'Channel Types', 'Zone', 'Territory', 'Status', 'Date']],
    body: apps.map(a => [
      a.trading_name,
      `${a.contact_person_name} ${a.contact_person_surname}`,
      a.email1,
      a.telephone_cell,
      a.channel_types?.join(', ') || '—',
      a.zone_name || '—',
      a.territory_name || '—',
      a.status,
      new Date(a.created_at).toLocaleDateString(),
    ]),
    styles: { fontSize: 7, cellPadding: 2 },
    headStyles: { fillColor: [0, 51, 102] },
    alternateRowStyles: { fillColor: [245, 248, 252] },
  });

  doc.save('applications-report.pdf');
}
