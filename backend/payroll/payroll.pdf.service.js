/**
 * Payslip PDF Generator — Modern Corporate Design
 *
 * Layout (top → bottom):
 *   Thin accent stripe → Header (logo + contact) → Divider
 *   → "SALARY SLIP" title band → Employee Details grid
 *   → Earnings/Deductions table → Attendance (compact row)
 *   → Net Salary box (with words) → Divider → Footer note
 */
const PDFDocument = require('pdfkit');
const path  = require('path');
const https = require('https');
const http  = require('http');
const fs    = require('fs');

// ─── Constants ────────────────────────────────────────────
const MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December'];

// Palette — light professional theme
const NAVY_DEFAULT = '#1e3a5f';  // fallback if no brand color set
const BLUE    = '#2563eb';   // subtle accent
const DARK    = '#1f2937';   // body text
const GRAY    = '#6b7280';   // secondary labels
const LGRAY   = '#9ca3af';   // light labels / dividers
const BGGRAY  = '#f9fafb';   // alternating row background
const BDBDR   = '#e5e7eb';   // border / divider colour
const WHITE   = '#ffffff';
const GREEN   = '#047857';   // net salary
const GREENLT = '#ecfdf5';   // net salary box background
const RED     = '#dc2626';   // deductions

// ─── Helpers ──────────────────────────────────────────────
const fmtINR = (n) => {
  const num = parseFloat(n) || 0;
  return '₹ ' + num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const fmtNum  = (n) => String(parseFloat(n) || 0);
const fmtDate = (d) => (d ? new Date(d) : new Date())
  .toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
const fmtDateTime = () => {
  const now = new Date();
  return now.toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) +
    ' ' + now.toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit', hour12: true });
};

// Convert amount to words (INR)
const ONES = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine',
              'Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen',
              'Seventeen','Eighteen','Nineteen'];
const TENS = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];

const numToWords = (n) => {
  const num = Math.round(parseFloat(n) || 0);
  if (num === 0) return 'Zero';
  const chunk = (x) => {
    if (x === 0) return '';
    if (x < 20)  return ONES[x] + ' ';
    if (x < 100) return TENS[Math.floor(x/10)] + (x%10 ? ' ' + ONES[x%10] : '') + ' ';
    return ONES[Math.floor(x/100)] + ' Hundred ' + chunk(x%100);
  };
  const crore = Math.floor(num / 10000000);
  const lakh  = Math.floor((num % 10000000) / 100000);
  const thou  = Math.floor((num % 100000) / 1000);
  const rest  = num % 1000;
  let w = '';
  if (crore) w += chunk(crore) + 'Crore ';
  if (lakh)  w += chunk(lakh)  + 'Lakh ';
  if (thou)  w += chunk(thou)  + 'Thousand ';
  if (rest)  w += chunk(rest);
  return w.trim() + ' Only';
};

// Fetch remote logo into Buffer
const fetchImageBuffer = (url) => new Promise((resolve) => {
  if (!url || (!url.startsWith('http://') && !url.startsWith('https://'))) return resolve(null);
  const mod = url.startsWith('https') ? https : http;
  mod.get(url, (res) => {
    if (res.statusCode !== 200) { res.resume(); return resolve(null); }
    const chunks = [];
    res.on('data', c => chunks.push(c));
    res.on('end',  () => resolve(Buffer.concat(chunks)));
    res.on('error',() => resolve(null));
  }).on('error', () => resolve(null));
});

// Resolve local file logo — tries multiple base paths, returns Buffer or null
const resolveLocalLogo = (logoRelPath) => {
  // logoRelPath may be:  /uploads/image/file.png  or  /uploads/branding/file.png  etc.
  const stripped = logoRelPath.replace(/^\/uploads\//, '');   // → image/file.png

  // Candidate base directories to search (order: most likely first)
  const bases = [
    path.join(__dirname, '..', 'uploads'),            // backend/uploads/
    path.join(__dirname, '..', '..', 'uploads'),      // project-root/uploads/
    path.join(__dirname, '..', 'public', 'uploads'),  // backend/public/uploads/
  ];

  for (const base of bases) {
    try {
      const abs = path.join(base, stripped);
      if (fs.existsSync(abs)) {
        console.log('[PDF] logo found at:', abs);
        return fs.readFileSync(abs);
      }
    } catch (_) {}
  }
  console.log('[PDF] logo NOT found on disk for:', logoRelPath);
  return null;
};

// Fetch logo via HTTP from localhost — always works if Express is running
const fetchLogoFromLocalServer = (logoRelPath) => {
  const port = process.env.PORT || 5000;
  // logoRelPath is like /uploads/image/file.png
  const urlPath = logoRelPath.startsWith('/') ? logoRelPath : `/${logoRelPath}`;
  const url = `http://127.0.0.1:${port}${urlPath}`;
  return fetchImageBuffer(url);
};

// ─── Main Generator ───────────────────────────────────────
const generateSlipPdf = async (slip) => {
  // ── Brand colour (from branding_settings.primary_color) ──
  const NAVY = slip.firm_primary_color || NAVY_DEFAULT;

  // ── Resolve logo ─────────────────────────────────────────
  // Strategy: disk read first (fast), HTTP localhost fallback (always works),
  //           remote fetch last.
  let logoBuffer = null;
  if (slip.firm_logo) {
    // ── Case 1: base64 data URL  (data:image/png;base64,XXXX)
    const dataUrlMatch = slip.firm_logo.match(/^data:([^;]+);base64,(.+)$/i);
    if (dataUrlMatch) {
      logoBuffer = Buffer.from(dataUrlMatch[2], 'base64');

    // ── Case 2: localhost URL  (http://localhost:5000/uploads/...)
    } else {
      const localhostMatch = slip.firm_logo.match(/^https?:\/\/(?:localhost|127\.0\.0\.1)(:\d+)?(\/.*)/i);
      const logoPath = localhostMatch ? localhostMatch[2] : slip.firm_logo;

      if (!slip.firm_logo.startsWith('http') || localhostMatch) {
        // Case 3: relative path  (/uploads/image/file.png)
        logoBuffer = resolveLocalLogo(logoPath);
        if (!logoBuffer) {
          logoBuffer = await fetchLogoFromLocalServer(logoPath);
        }
      } else {
        // Case 4: remote HTTPS URL
        logoBuffer = await fetchImageBuffer(slip.firm_logo);
      }
    }
  }

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 0, bufferPages: true });
    const bufs = [];
    doc.on('data',  c => bufs.push(c));
    doc.on('end',   () => resolve(Buffer.concat(bufs)));
    doc.on('error', reject);

    const PW = doc.page.width;   // 595.28 pt
    const PH = doc.page.height;  // 841.89 pt
    const ML = 45;               // left margin
    const MR = PW - 45;         // right boundary
    const CW = MR - ML;         // content width  ≈ 505 pt

    // ── Slip data ─────────────────────────────────────────
    const empName     = `${slip.first_name || ''} ${slip.last_name || ''}`.trim();
    const empCode     = slip.employee_code  || '—';
    const designation = slip.designation    || '—';
    const panNum      = slip.pan_number     || '—';
    const bankInfo    = slip.bank_name
      ? `${slip.bank_name}${slip.account_number ? ' • ' + slip.account_number : ''}${slip.ifsc_code ? ' • ' + slip.ifsc_code : ''}`
      : '—';
    const monthName   = MONTHS[(parseInt(slip.month) || 1) - 1];
    const periodLabel = `${monthName} ${slip.year}`;
    const genOn       = fmtDateTime();

    const firmAddr    = slip.firm_address || '';
    const firmPhone   = slip.firm_phone   || '';
    const firmEmail   = slip.firm_email   || '';
    const firmWebsite = slip.firm_website || '';

    const basic       = parseFloat(slip.monthly_salary    || 0);
    const reimb       = parseFloat(slip.reimbursement     || 0);
    const absDed      = parseFloat(slip.absent_deduction  || 0);
    const adj         = parseFloat(slip.adjustment        || 0);
    const netPay      = parseFloat(slip.final_salary      || 0);

    const totalEarn   = basic + reimb + (adj > 0 ? adj : 0);
    const totalDed    = absDed + (adj < 0 ? Math.abs(adj) : 0);

    // ══════════════════════════════════════════════════════
    // 1. TOP ACCENT STRIPE
    // ══════════════════════════════════════════════════════
    doc.rect(0, 0, PW, 6).fill(NAVY);

    // ══════════════════════════════════════════════════════
    // 2. HEADER — full-width logo + contact details
    // ══════════════════════════════════════════════════════
    let y = 6;
    const LOGO_MAX_W = CW;        // full content width  ≈ 505 pt
    const LOGO_MAX_H = 100;       // generous height for wide/tall logos
    const LOGO_PAD_TOP = 16;
    const LOGO_PAD_BOT = 12;

    if (logoBuffer) {
      try {
        // Use PDFKit's fit to scale proportionally within the max box.
        // Place at ML so it can expand to full content width.
        doc.image(logoBuffer, ML, y + LOGO_PAD_TOP, {
          fit:   [LOGO_MAX_W, LOGO_MAX_H],
          align: 'center',
          valign: 'center',
        });
        y += LOGO_PAD_TOP + LOGO_MAX_H + LOGO_PAD_BOT;
      } catch (err) {
        console.error('[PDF] doc.image() failed:', err.message);
        // Fallback text header
        doc.fillColor(NAVY).font('Helvetica-Bold').fontSize(18)
           .text(slip.firm_name || 'CA Firm', ML, y + LOGO_PAD_TOP, { width: CW, align: 'center', lineBreak: false });
        y += LOGO_PAD_TOP + 24 + LOGO_PAD_BOT;
      }
    } else {
      // No logo — show firm name as large bold text
      doc.fillColor(NAVY).font('Helvetica-Bold').fontSize(18)
         .text(slip.firm_name || 'CA Firm', ML, y + LOGO_PAD_TOP, { width: CW, align: 'center', lineBreak: false });
      y += LOGO_PAD_TOP + 26 + LOGO_PAD_BOT;
    }

    // Address line (optional)
    if (firmAddr) {
      doc.fillColor(GRAY).font('Helvetica').fontSize(8)
         .text(firmAddr, ML, y, { width: CW, align: 'center', lineBreak: false });
      y += 13;
    }

    // Phone • Email • Website (optional)
    const contactParts = [firmPhone, firmEmail, firmWebsite].filter(Boolean);
    if (contactParts.length) {
      doc.fillColor(LGRAY).font('Helvetica').fontSize(7.5)
         .text(contactParts.join('   •   '), ML, y, { width: CW, align: 'center', lineBreak: false });
      y += 13;
    }

    y += 8;

    // Thin divider below header
    doc.moveTo(ML, y).lineTo(MR, y).strokeColor(BDBDR).lineWidth(0.6).stroke();
    y += 12;

    // ══════════════════════════════════════════════════════
    // 3. "SALARY SLIP" TITLE BAND
    // ══════════════════════════════════════════════════════
    const BAND_H = 28;
    doc.rect(ML, y, CW, BAND_H).fill(NAVY);
    doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(11)
       .text('SALARY SLIP', ML, y + 8, { width: CW * 0.5, align: 'center', lineBreak: false });
    doc.fillColor('rgba(255,255,255,0.65)').font('Helvetica').fontSize(8.5)
       .text(`Salary Period: ${periodLabel}`, ML + CW * 0.5, y + 10, { width: CW * 0.5, align: 'center', lineBreak: false });
    y += BAND_H + 10;

    // ══════════════════════════════════════════════════════
    // 4. EMPLOYEE DETAILS — 2-column compact grid
    // ══════════════════════════════════════════════════════
    const CELL_H   = 36;
    const COL_L    = ML;
    const COL_R    = ML + CW / 2 + 2;
    const COL_W    = CW / 2 - 2;

    const drawInfoCell = (label, value, cx, cy, cw, bg) => {
      doc.rect(cx, cy, cw, CELL_H).fillAndStroke(bg || WHITE, BDBDR);
      doc.fillColor(LGRAY).font('Helvetica').fontSize(6.5)
         .text(label.toUpperCase(), cx + 10, cy + 7, { width: cw - 14, lineBreak: false });
      doc.fillColor(DARK).font('Helvetica-Bold').fontSize(9)
         .text(value || '—', cx + 10, cy + 18, { width: cw - 14, lineBreak: false });
    };

    // Row 1
    drawInfoCell('Employee Name', empName,     COL_L, y, COL_W);
    drawInfoCell('Employee ID',   empCode,     COL_R, y, COL_W, BGGRAY);
    y += CELL_H;

    // Row 2
    drawInfoCell('Designation',   designation, COL_L, y, COL_W, BGGRAY);
    drawInfoCell('PAN Number',    panNum,      COL_R, y, COL_W);
    y += CELL_H;

    // Row 3 — bank details spans left, salary month right
    drawInfoCell('Bank Details',  bankInfo,    COL_L, y, COL_W);
    drawInfoCell('Salary Month',  periodLabel, COL_R, y, COL_W, BGGRAY);
    y += CELL_H;

    // Row 4 — Generated On (spans full width, smaller cell)
    const GEN_H = 24;
    doc.rect(ML, y, CW, GEN_H).fillAndStroke(BGGRAY, BDBDR);
    doc.fillColor(LGRAY).font('Helvetica').fontSize(7)
       .text('Generated On:', ML + 10, y + 8, { continued: true })
       .fillColor(DARK).font('Helvetica-Bold').fontSize(7)
       .text('  ' + genOn, { lineBreak: false });
    y += GEN_H + 12;

    // ══════════════════════════════════════════════════════
    // 5. EARNINGS & DEDUCTIONS TABLE
    // ══════════════════════════════════════════════════════
    const C_DESC = CW * 0.44;
    const C_EARN = CW * 0.28;
    const C_DED  = CW * 0.28;
    const TH_H   = 24;
    const ROW_H  = 23;

    // Table header
    doc.rect(ML,                   y, C_DESC, TH_H).fill(NAVY);
    doc.rect(ML + C_DESC,          y, C_EARN, TH_H).fill(NAVY);
    doc.rect(ML + C_DESC + C_EARN, y, C_DED,  TH_H).fill(NAVY);

    doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(7.5);
    doc.text('DESCRIPTION',  ML + 10,                   y + 8, { width: C_DESC - 14, lineBreak: false });
    doc.text('EARNINGS',     ML + C_DESC + 8,           y + 8, { width: C_EARN - 14, align: 'right', lineBreak: false });
    doc.text('DEDUCTIONS',   ML + C_DESC + C_EARN + 8,  y + 8, { width: C_DED - 14,  align: 'right', lineBreak: false });
    y += TH_H;

    const tableRows = [
      { label: 'Basic Salary',     earn: basic,            ded: null  },
      { label: 'Reimbursement',    earn: reimb > 0 ? reimb : null, ded: null },
      { label: 'Absent Deduction', earn: null,             ded: absDed > 0 ? absDed : null },
      { label: 'Other Adjustments',
        earn: adj > 0 ? adj  : null,
        ded:  adj < 0 ? Math.abs(adj) : null },
    ];

    tableRows.forEach((row, idx) => {
      const bg = idx % 2 === 0 ? WHITE : BGGRAY;
      doc.rect(ML,                   y, C_DESC, ROW_H).fillAndStroke(bg, BDBDR);
      doc.rect(ML + C_DESC,          y, C_EARN, ROW_H).fillAndStroke(bg, BDBDR);
      doc.rect(ML + C_DESC + C_EARN, y, C_DED,  ROW_H).fillAndStroke(bg, BDBDR);

      const midY = y + (ROW_H / 2) - 4;
      doc.fillColor(DARK).font('Helvetica').fontSize(8.5)
         .text(row.label, ML + 10, midY, { width: C_DESC - 14, lineBreak: false });

      if (row.earn != null) {
        doc.fillColor(GREEN).font('Helvetica').fontSize(8.5)
           .text(fmtINR(row.earn), ML + C_DESC + 8, midY, { width: C_EARN - 14, align: 'right', lineBreak: false });
      }
      if (row.ded != null) {
        doc.fillColor(RED).font('Helvetica').fontSize(8.5)
           .text(fmtINR(row.ded), ML + C_DESC + C_EARN + 8, midY, { width: C_DED - 14, align: 'right', lineBreak: false });
      }
      y += ROW_H;
    });

    // Totals row
    const TOT_H = 26;
    doc.rect(ML,                   y, C_DESC, TOT_H).fillAndStroke('#eef2f7', BDBDR);
    doc.rect(ML + C_DESC,          y, C_EARN, TOT_H).fillAndStroke('#eef2f7', BDBDR);
    doc.rect(ML + C_DESC + C_EARN, y, C_DED,  TOT_H).fillAndStroke('#eef2f7', BDBDR);

    const totMidY = y + (TOT_H / 2) - 4;
    doc.fillColor(NAVY).font('Helvetica-Bold').fontSize(9)
       .text('TOTAL', ML + 10, totMidY, { width: C_DESC - 14, lineBreak: false });
    doc.fillColor(GREEN).font('Helvetica-Bold').fontSize(9)
       .text(fmtINR(totalEarn), ML + C_DESC + 8, totMidY, { width: C_EARN - 14, align: 'right', lineBreak: false });
    doc.fillColor(RED).font('Helvetica-Bold').fontSize(9)
       .text(fmtINR(totalDed), ML + C_DESC + C_EARN + 8, totMidY, { width: C_DED - 14, align: 'right', lineBreak: false });
    y += TOT_H + 12;

    // ══════════════════════════════════════════════════════
    // 6. ATTENDANCE SUMMARY — compact 3-card row
    // ══════════════════════════════════════════════════════
    const ATT_W  = CW * 0.54;
    const ATT_H  = 52;
    const CARD_W = (ATT_W - 2) / 3;

    const attItems = [
      { label: 'Working Days', value: fmtNum(slip.working_days || 26) },
      { label: 'Days Present', value: fmtNum(slip.present_days  || 26) },
      { label: 'Days Absent',  value: fmtNum(slip.absent_days   || 0)  },
    ];

    attItems.forEach((item, i) => {
      const cx  = ML + i * CARD_W + (i > 0 ? 2 : 0);
      const cbg = i % 2 === 0 ? '#f8fafc' : '#f1f5f9';
      doc.rect(cx, y, CARD_W, ATT_H).fillAndStroke(cbg, BDBDR);
      doc.fillColor(LGRAY).font('Helvetica').fontSize(7)
         .text(item.label, cx + 8, y + 8, { width: CARD_W - 12, align: 'center', lineBreak: false });
      doc.fillColor(NAVY).font('Helvetica-Bold').fontSize(18)
         .text(item.value, cx + 8, y + 18, { width: CARD_W - 12, align: 'center', lineBreak: false });
      doc.fillColor(LGRAY).font('Helvetica').fontSize(6.5)
         .text('days', cx + 8, y + 39, { width: CARD_W - 12, align: 'center', lineBreak: false });
    });

    // ══════════════════════════════════════════════════════
    // 7. NET SALARY BOX — right of attendance
    // ══════════════════════════════════════════════════════
    const NET_X = ML + ATT_W + 6;
    const NET_W = CW - ATT_W - 6;

    // Outer rounded box
    doc.roundedRect(NET_X, y, NET_W, ATT_H, 6).fill(GREENLT);
    doc.roundedRect(NET_X, y, NET_W, ATT_H, 6).stroke(GREEN);

    doc.fillColor(GREEN).font('Helvetica-Bold').fontSize(7.5)
       .text('NET SALARY', NET_X, y + 8, { width: NET_W, align: 'center', lineBreak: false });
    doc.fillColor(GREEN).font('Helvetica-Bold').fontSize(17)
       .text(fmtINR(netPay), NET_X, y + 18, { width: NET_W, align: 'center', lineBreak: false });
    doc.fillColor(GREEN).font('Helvetica').fontSize(6.5)
       .text(periodLabel, NET_X, y + 40, { width: NET_W, align: 'center', lineBreak: false });

    y += ATT_H + 10;

    // Salary in words
    const inWords = numToWords(netPay);
    doc.rect(ML, y, CW, 20).fill(BGGRAY);
    doc.fillColor(GRAY).font('Helvetica').fontSize(7.5)
       .text('Amount in Words: ', ML + 10, y + 6, { continued: true })
       .fillColor(DARK).font('Helvetica-Bold').fontSize(7.5)
       .text(`${inWords} Rupees`, { lineBreak: false });
    y += 20 + 16;

    // ══════════════════════════════════════════════════════
    // 8. FOOTER
    // ══════════════════════════════════════════════════════
    // Divider before footer
    doc.moveTo(ML, y).lineTo(MR, y).strokeColor(BDBDR).lineWidth(0.6).stroke();
    y += 10;

    doc.fillColor(LGRAY).font('Helvetica').fontSize(7)
       .text(
         'This is a computer generated payslip and does not require physical signature.',
         ML, y, { width: CW, align: 'center', lineBreak: false }
       );

    doc.end();
  });
};

module.exports = { generateSlipPdf };
