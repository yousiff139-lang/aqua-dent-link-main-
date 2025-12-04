/**
 * PDF Report Generator
 * Generates a printable HTML report for PDF export
 */

interface PatientData {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  created_at: string;
  total_appointments?: number;
}

interface DentistData {
  id: string;
  name: string;
  email: string;
  phone?: string;
  specialization?: string[] | string;
  rating?: number;
  total_appointments?: number;
}

interface AppointmentData {
  id: string;
  appointment_date: string;
  appointment_time: string;
  patient_name: string;
  dentist_name: string;
  status: string;
  payment_status: string;
  payment_method: string;
  symptoms?: string;
  booking_source?: string;
}

/**
 * Export system report as PDF
 */
export async function exportSystemDataToExcel(): Promise<void> {
  try {
    // Import api helper
    const { default: api } = await import('@/lib/api');

    // Fetch all data from backend
    const response = await api.get<{ success: boolean; data: any }>('/admin/export/data');

    if (!response.success || !response.data) {
      throw new Error('Failed to fetch export data');
    }

    const data = response.data;

    // Generate HTML report
    const htmlContent = generateHTMLReport(
      data.summary || {},
      data.patients || [],
      data.dentists || [],
      data.appointments || []
    );

    // Open in new window for printing/PDF save
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();

      // Wait a moment for content to load, then trigger print dialog
      setTimeout(() => {
        printWindow.print();
      }, 500);
    }
  } catch (error) {
    console.error('Export error:', error);
    throw error;
  }
}

/**
 * Generate HTML report with styled tables
 */
function generateHTMLReport(
  summary: any,
  patients: PatientData[],
  dentists: DentistData[],
  appointments: AppointmentData[]
): string {
  const today = new Date().toLocaleDateString();

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>System Report - ${today}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      padding: 40px;
      background: white;
      color: #1f2937;
      line-height: 1.6;
    }
    
    .header {
      text-align: center;
      margin-bottom: 40px;
      padding-bottom: 20px;
      border-bottom: 3px solid #2563eb;
    }
    
    h1 {
      color: #2563eb;
      font-size: 32px;
      margin-bottom: 10px;
    }
    
    .subtitle {
      color: #6b7280;
      font-size: 16px;
    }
    
    .section {
      margin-bottom: 40px;
      page-break-inside: avoid;
    }
    
    h2 {
      color: #1f2937;
      font-size: 24px;
      margin-bottom: 15px;
      padding-bottom: 10px;
      border-bottom: 2px solid #e5e7eb;
    }
    
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }
    
    .stat-card {
      background: #f9fafb;
      padding: 20px;
      border-radius: 8px;
      border-left: 4px solid #2563eb;
    }
    
    .stat-label {
      font-size: 14px;
      color: #6b7280;
      margin-bottom: 5px;
    }
    
    .stat-value {
      font-size: 28px;
      font-weight: bold;
      color: #1f2937;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
      background: white;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    
    thead {
      background: #2563eb;
      color: white;
    }
    
    th {
      padding: 12px;
      text-align: left;
      font-weight: 600;
      font-size: 14px;
    }
    
    td {
      padding: 12px;
      border-bottom: 1px solid #e5e7eb;
      font-size: 13px;
    }
    
    tbody tr:hover {
      background: #f9fafb;
    }
    
    tbody tr:last-child td {
      border-bottom: none;
    }
    
    .status-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 500;
    }
    
    .status-pending { background: #fef3c7; color: #92400e; }
    .status-upcoming { background: #dbeafe; color: #1e40af; }
    .status-completed { background: #d1fae5; color: #065f46; }
    .status-cancelled { background: #fee2e2; color: #991b1b; }
    
    .empty-state {
      text-align: center;
      padding: 40px;
      color: #9ca3af;
      font-style: italic;
    }
    
    @media print {
      body {
        padding: 20px;
      }
      
      .section {
        page-break-inside: avoid;
      }
      
      button {
        display: none;
      }
    }
    
    .print-button {
      position: fixed;
      top: 20px;
      right: 20px;
      background: #2563eb;
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 8px;
      font-size: 16px;
      cursor: pointer;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      z-index: 1000;
    }
    
    .print-button:hover {
      background: #1d4ed8;
    }
    
    @media print {
      .print-button {
        display: none;
      }
    }
  </style>
</head>
<body>
  <button class="print-button" onclick="window.print()">💾 Save as PDF</button>
  
  <div class="header">
    <h1>📊 System Report</h1>
    <p class="subtitle">Generated on ${today}</p>
  </div>
  
  <!-- SUMMARY SECTION -->
  <div class="section">
    <h2>📈 Summary Statistics</h2>
    <div class="summary-grid">
      <div class="stat-card">
        <div class="stat-label">Total Patients</div>
        <div class="stat-value">${summary.totalPatients || 0}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Total Dentists</div>
        <div class="stat-value">${summary.totalDentists || 0}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Total Appointments</div>
        <div class="stat-value">${summary.totalAppointments || 0}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Pending Appointments</div>
        <div class="stat-value">${summary.pendingAppointments || 0}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Completed Appointments</div>
        <div class="stat-value">${summary.completedAppointments || 0}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Upcoming Appointments</div>
        <div class="stat-value">${summary.upcomingAppointments || 0}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Cancelled Appointments</div>
        <div class="stat-value">${summary.cancelledAppointments || 0}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Pending Revenue</div>
        <div class="stat-value">$${summary.pendingRevenue || 0}</div>
      </div>
    </div>
    
    ${summary.topSymptoms && summary.topSymptoms.length > 0 ? `
      <h3 style="margin-top: 20px; margin-bottom: 10px;">Top 10 Symptoms</h3>
      <table>
        <thead>
          <tr>
            <th>Rank</th>
            <th>Symptom</th>
            <th>Count</th>
          </tr>
        </thead>
        <tbody>
          ${summary.topSymptoms.map((s: any, i: number) => `
            <tr>
              <td>${i + 1}</td>
              <td>${escapeHTML(s.symptom)}</td>
              <td>${s.count}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    ` : ''}
  </div>
  
  <!-- PATIENTS SECTION -->
  <div class="section">
    <h2>👥 Patients (${patients.length})</h2>
    ${patients.length > 0 ? `
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Phone</th>
            <th>Joined Date</th>
            <th>Appointments</th>
          </tr>
        </thead>
        <tbody>
          ${patients.map(p => `
            <tr>
              <td>${escapeHTML(p.full_name || 'N/A')}</td>
              <td>${escapeHTML(p.email || 'N/A')}</td>
              <td>${escapeHTML(p.phone || 'N/A')}</td>
              <td>${new Date(p.created_at).toLocaleDateString()}</td>
              <td>${p.total_appointments || 0}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    ` : '<div class="empty-state">No patients found</div>'}
  </div>
  
  <!-- DENTISTS SECTION -->
  <div class="section">
    <h2>🦷 Dentists (${dentists.length})</h2>
    ${dentists.length > 0 ? `
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Phone</th>
            <th>Specialization</th>
            <th>Rating</th>
            <th>Appointments</th>
          </tr>
        </thead>
        <tbody>
          ${dentists.map(d => {
    let specialization = 'General';
    if (d.specialization) {
      if (Array.isArray(d.specialization)) {
        specialization = d.specialization.join(', ') || 'General';
      } else if (typeof d.specialization === 'string') {
        specialization = d.specialization;
      }
    }

    return `
              <tr>
                <td>${escapeHTML(d.name || 'N/A')}</td>
                <td>${escapeHTML(d.email || 'N/A')}</td>
                <td>${escapeHTML(d.phone || 'N/A')}</td>
                <td>${escapeHTML(specialization)}</td>
                <td>⭐ ${(d.rating || 0).toFixed(1)}</td>
                <td>${d.total_appointments || 0}</td>
              </tr>
            `;
  }).join('')}
        </tbody>
      </table>
    ` : '<div class="empty-state">No dentists found</div>'}
  </div>
  
  <!-- APPOINTMENTS SECTION -->
  <div class="section">
    <h2>📅 Appointments (${appointments.length})</h2>
    ${appointments.length > 0 ? `
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Time</th>
            <th>Patient</th>
            <th>Dentist</th>
            <th>Status</th>
            <th>Payment</th>
            <th>Source</th>
          </tr>
        </thead>
        <tbody>
          ${appointments.map(a => `
            <tr>
              <td>${new Date(a.appointment_date).toLocaleDateString()}</td>
              <td>${a.appointment_time}</td>
              <td>${escapeHTML(a.patient_name || 'N/A')}</td>
              <td>${escapeHTML(a.dentist_name || 'N/A')}</td>
              <td><span class="status-badge status-${a.status}">${a.status}</span></td>
              <td>${a.payment_status}</td>
              <td>${a.booking_source || 'manual'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    ` : '<div class="empty-state">No appointments found</div>'}
  </div>
  
  <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 2px solid #e5e7eb; color: #6b7280; font-size: 14px;">
    <p>Report generated by Aqua Dent Link Admin System</p>
    <p>© ${new Date().getFullYear()} - All rights reserved</p>
  </div>
</body>
</html>
  `;
}

/**
 * Escape HTML special characters
 */
function escapeHTML(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
