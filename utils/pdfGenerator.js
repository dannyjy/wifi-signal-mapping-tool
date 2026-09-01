const PDFDocument = require('pdfkit');
const { classifySignal, calculateMetrics } = require('./idwCalculator');

function generatePDFReport(sessionData, res) {
  const doc = new PDFDocument({ margin: 40, size: 'A4' });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="wifi_report_${sessionData.session_id}.pdf"`);

  doc.pipe(res);

  // Header Banner (Slate & Emerald Theme)
  doc.rect(40, 40, 515, 60).fill('#0F172A'); // Slate 900
  doc.rect(40, 97, 515, 3).fill('#10B981');  // Emerald 500

  doc.fill('#FFFFFF')
     .fontSize(18)
     .font('Helvetica-Bold')
     .text('UNIVERSITY OF JUBA - ICT INFRASTRUCTURE REPORT', 55, 52);

  doc.fill('#94A3B8')
     .fontSize(10)
     .font('Helvetica')
     .text('Wireless Network Signal Strength Audit & Diagnostic Analysis', 55, 76);

  doc.moveDown(3);

  // Document Metadata Box
  const startY = 120;
  doc.rect(40, startY, 515, 80).fill('#F8FAFC').stroke('#E2E8F0');
  
  doc.fill('#0F172A').fontSize(11).font('Helvetica-Bold');
  doc.text('Session Name:', 55, startY + 12);
  doc.text('Building & Floor:', 55, startY + 30);
  doc.text('Surveyor:', 55, startY + 48);

  doc.font('Helvetica').fill('#334155');
  doc.text(sessionData.session_name, 160, startY + 12);
  doc.text(`${sessionData.building_name} (${sessionData.building_code}) - Floor ${sessionData.floor_number}`, 160, startY + 30);
  doc.text(`${sessionData.surveyor_name || 'System Surveyor'} | Date: ${new Date(sessionData.survey_date).toLocaleDateString()}`, 160, startY + 48);

  doc.fill('#0F172A').fontSize(11).font('Helvetica-Bold');
  doc.text('Status:', 380, startY + 12);
  doc.text('Scale Factor:', 380, startY + 30);

  doc.font('Helvetica').fill('#10B981');
  doc.text(sessionData.status.toUpperCase(), 450, startY + 12);
  doc.fill('#334155');
  doc.text(`${sessionData.scale_factor || 1.0} px/m`, 450, startY + 30);

  // Calculate Metrics
  const points = sessionData.points || [];
  const metrics = calculateMetrics(points);

  // Key Metric KPI Cards
  const kpiY = startY + 95;
  const cardWidth = 120;

  // Card 1: Avg Signal
  doc.rect(40, kpiY, cardWidth, 55).fill('#F1F5F9').stroke('#CBD5E1');
  doc.fill('#475569').fontSize(9).font('Helvetica-Bold').text('AVERAGE SIGNAL', 48, kpiY + 8);
  doc.fill(metrics.avgRSSI && parseFloat(metrics.avgRSSI) >= -65 ? '#10B981' : '#EF4444')
     .fontSize(16).font('Helvetica-Bold')
     .text(`${metrics.avgRSSI || 'N/A'} dBm`, 48, kpiY + 26);

  // Card 2: Sample Points
  doc.rect(170, kpiY, cardWidth, 55).fill('#F1F5F9').stroke('#CBD5E1');
  doc.fill('#475569').fontSize(9).font('Helvetica-Bold').text('LOGGED POINTS', 178, kpiY + 8);
  doc.fill('#0F172A').fontSize(16).font('Helvetica-Bold').text(`${metrics.totalPoints}`, 178, kpiY + 26);

  // Card 3: Dead Zones %
  doc.rect(300, kpiY, cardWidth, 55).fill('#F1F5F9').stroke('#CBD5E1');
  doc.fill('#475569').fontSize(9).font('Helvetica-Bold').text('DEAD ZONES (< -70dBm)', 308, kpiY + 8);
  doc.fill('#EF4444').fontSize(16).font('Helvetica-Bold').text(`${metrics.percentages.poor}%`, 308, kpiY + 26);

  // Card 4: Deployed APs
  const apCount = (sessionData.aps || []).length;
  doc.rect(430, kpiY, cardWidth, 55).fill('#F1F5F9').stroke('#CBD5E1');
  doc.fill('#475569').fontSize(9).font('Helvetica-Bold').text('DEPLOYED APs', 438, kpiY + 8);
  doc.fill('#3B82F6').fontSize(16).font('Helvetica-Bold').text(`${apCount}`, 438, kpiY + 26);

  // Signal Quality Distribution Section
  const distY = kpiY + 70;
  doc.fill('#0F172A').fontSize(13).font('Helvetica-Bold').text('Signal Quality Threshold Distribution', 40, distY);
  doc.rect(40, distY + 18, 515, 24).fill('#F8FAFC').stroke('#CBD5E1');

  doc.fontSize(9).font('Helvetica');
  doc.fill('#10B981').text(`Excellent (≥ -50 dBm): ${metrics.breakdown.excellent} pts (${metrics.percentages.excellent}%)`, 45, distY + 25);
  doc.fill('#3B82F6').text(`Good (-50..-60): ${metrics.breakdown.good} pts (${metrics.percentages.good}%)`, 185, distY + 25);
  doc.fill('#F59E0B').text(`Fair (-60..-70): ${metrics.breakdown.acceptable} pts (${metrics.percentages.acceptable}%)`, 320, distY + 25);
  doc.fill('#EF4444').text(`Poor (< -70): ${metrics.breakdown.poor} pts (${metrics.percentages.poor}%)`, 440, distY + 25);

  // Access Points Inventory Table
  let currentY = distY + 55;
  doc.fill('#0F172A').fontSize(13).font('Helvetica-Bold').text('Annotated Access Points (APs)', 40, currentY);
  currentY += 18;

  doc.rect(40, currentY, 515, 20).fill('#0F172A');
  doc.fill('#FFFFFF').fontSize(9).font('Helvetica-Bold');
  doc.text('SSID', 50, currentY + 6);
  doc.text('MAC Address', 200, currentY + 6);
  doc.text('Channel', 340, currentY + 6);
  doc.text('Tx Power (dBm)', 440, currentY + 6);

  currentY += 20;

  const aps = sessionData.aps || [];
  if (aps.length === 0) {
    doc.rect(40, currentY, 515, 20).fill('#F8FAFC').stroke('#E2E8F0');
    doc.fill('#64748b').fontSize(9).font('Helvetica').text('No Access Points annotated on this floor plan.', 50, currentY + 5);
    currentY += 25;
  } else {
    aps.forEach((ap, idx) => {
      const rowBg = idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
      doc.rect(40, currentY, 515, 20).fill(rowBg).stroke('#E2E8F0');
      doc.fill('#334155').fontSize(9).font('Helvetica');
      doc.text(ap.ssid, 50, currentY + 5);
      doc.text(ap.mac_address || 'N/A', 200, currentY + 5);
      doc.text(`${ap.channel || 'Auto'}`, 340, currentY + 5);
      doc.text(`${ap.tx_power_dbm} dBm`, 440, currentY + 5);
      currentY += 20;
    });
    currentY += 10;
  }

  // Engineering Diagnostics & Recommendations
  currentY += 10;
  doc.fill('#0F172A').fontSize(13).font('Helvetica-Bold').text('Engineering Diagnostics & Actionable Recommendations', 40, currentY);
  currentY += 18;

  doc.rect(40, currentY, 515, 75).fill('#FEF2F2').stroke('#FCA5A5');
  doc.fill('#991B1B').fontSize(10).font('Helvetica-Bold').text('Coverage Risk Assessment:', 50, currentY + 10);

  let recText = '';
  if (metrics.percentages.poor > 20) {
    recText = `CRITICAL: ${metrics.percentages.poor}% of measured locations suffer from poor coverage (< -70 dBm). Immediate deployment of an additional 802.11ax Access Point is strongly recommended near weak signal corridors to eliminate dead zones.`;
  } else if (metrics.percentages.poor > 5) {
    recText = `MODERATE: Minor dead zones detected (${metrics.percentages.poor}%). Consider increasing Tx Power on adjacent Access Points or optimizing channel allocations to reduce co-channel interference.`;
  } else {
    recText = `OPTIMAL: Excellent spatial coverage achieved. Signal strength across 95%+ of the floor plan satisfies enterprise voice/video performance requirements (>= -70 dBm).`;
  }

  doc.fill('#7F1D1D').fontSize(9).font('Helvetica').text(recText, 50, currentY + 26, { width: 495 });

  // Notes section if present
  if (sessionData.notes) {
    currentY += 85;
    doc.fill('#0F172A').fontSize(11).font('Helvetica-Bold').text('Surveyor Field Notes:', 40, currentY);
    doc.fill('#475569').fontSize(9).font('Helvetica').text(sessionData.notes, 40, currentY + 15, { width: 515 });
  }

  // Footer
  doc.fontSize(8).fill('#94A3B8').text(
    `Generated by Wi-Fi Signal Strength Mapping Tool | University of Juba ICT Department | ${new Date().toLocaleString()}`,
    40,
    doc.page.height - 30,
    { align: 'center' }
  );

  doc.end();
}

module.exports = {
  generatePDFReport
};
