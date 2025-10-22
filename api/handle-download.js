// File: /api/handle-download.js
import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';

export const config = {
  api: { bodyParser: true },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'text/plain' });
    res.end('Method Not Allowed');
    return;
  }

  const email = req.body.email?.trim() || '';
  const docType = req.body.document_type?.trim() || '';

  // --- 文档库配置（保持原文案与路径一致） ---
  const documentLibrary = {
    trouble_zones: {
      file_path: path.join(process.cwd(), 'drop/GorgeoFasteners_6_Trouble_Zones_Checklist_2025.pdf'),
      subject: 'Here is your requested guide: The "6 Trouble Zones" Checklist',
      body: `Hi there,<br><br>
        As requested, attached is your copy of the <strong>"6 Hidden Trouble Zones in Conveyor Systems"</strong> checklist.<br><br>
        This isn't a theoretical list. It's the exact field-tested tool our consultants use to diagnose the root cause of over 90% of common assembly failures. 
        Use it to spot risks in your own designs before they become production problems.<br><br>
        Once the checklist helps you identify a potential trouble zone, the next step is to define a robust solution. 
        Reply to this email with your drawing for a confidential review by our engineering team.<br><br>`
    },
    Blind_Fit: {
      file_path: path.join(process.cwd(), 'drop/GorgeoFasteners_Checklist_BlindFit_SleeveDesign.pdf'),
      subject: 'Here is the "Blind-Fit Sleeve Design Checklist" you requested',
      body: `Hi there,<br><br>
        Thank you for requesting our technical resources. Attached is the <strong>"Blind-Fit Sleeve Design Checklist"</strong>.<br><br>
        This guide highlights 7 commonly missed features — from extraction grooves to insertion stops — that often turn blind fits into stuck or unserviceable joints, 
        leading to costly downtime.<br><br>
        If you’re facing a specific sleeve or insert challenge, let's move from checklist to solution. 
        Reply with your drawing for targeted feedback from our application engineers.<br><br>`
    },
    pre_assembly: {
      file_path: path.join(process.cwd(), 'drop/GorgeoFasteners_PreAssembly_Drawing_Checklist_2025.pdf'),
      subject: 'Your Requested Pre-Assembly Drawing Checklist',
      body: `Hi there,<br><br>
        As requested, attached is your copy of the <strong>Pre-Assembly Drawing Checklist</strong>.<br><br>
        We developed this tool to pre-flight designs internally, catching minor oversights before they escalate into major rework or line-down situations. 
        Use it to ensure your drawings are robust from the start.<br><br>
        If the checklist flags a potential issue, our engineers can help you find a solution. Reply with your drawing for a targeted analysis.<br><br>`
    },
    tolerance: {
      file_path: path.join(process.cwd(), 'drop/GorgeoFasteners_Fastener_Tolerance_Checklist_2025.pdf'),
      subject: 'Your Requested Fastener Tolerance Checklist for Sorters',
      body: `Hi there,<br><br>
        Attached is your <strong>Fastener Tolerance Checklist</strong>, specifically tailored for high-speed sorter modules.<br><br>
        This checklist focuses on the geometric controls needed to prevent joint relaxation and subsequent re-torque events within the critical first 72 hours of operation — 
        a common failure point in sortation systems.<br><br>
        When you're ready to lock in your design's long-term reliability, reply with your drawing for a detailed tolerance stack-up review.<br><br>`
    },
    drop032: {
      file_path: path.join(process.cwd(), 'drop/case-study-coating-jam-fit/GorgeoFasteners_CaseStudy_Coating_Jam_2025.pdf'),
      subject: 'Your Requested Teardown: "CAD Passed, Coating Jammed" Case Study',
      body: `Hi there,<br><br>
        As requested, attached is the PDF teardown report: <strong>"Case #032: CAD Passed, Coating Jammed the Fit"</strong>.<br><br>
        This case study highlights how unmodeled variables like coating thickness can derail an otherwise sound design. 
        It's a critical lesson in bridging the gap between digital models and physical reality.<br><br>
        If this analysis resonates with a challenge you're currently facing, let our engineers provide a second opinion. 
        Reply with your drawing for a confidential, no-obligation review.<br><br>`
    }
  };

  // --- 输入验证 ---
  if (!email || !validateEmail(email) || !documentLibrary[docType]) {
    res.writeHead(302, { Location: '/drop/error.html' });
    res.end();
    return;
  }

  const currentDoc = documentLibrary[docType];
  if (!fs.existsSync(currentDoc.file_path)) {
    console.error(`Attachment not found for type ${docType}: ${currentDoc.file_path}`);
    res.writeHead(302, { Location: '/drop/error.html' });
    res.end();
    return;
  }

  const signature = `
    Best regards,<br>
    <strong>Catherine Zhang</strong><br>
    <span>Senior Assembly Fit Consultant</span><br>
    <span>Structural Fit Reliability · ±0.01 mm</span><br>
    <span>Gorgeo Fasteners | Sleeves · Pins · Locator Bolts</span>
  `;
  const fullBody = `<div style="font-family: Calibri, sans-serif; font-size: 10.05pt; color: #000;">${currentDoc.body}${signature}</div>`;

  try {
    // --- 邮件配置 ---
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT, 10),
      secure: true,
      auth: {
        user: process.env.SMTP_USERNAME,
        pass: process.env.SMTP_PASSWORD,
      },
    });

    // --- 邮件发送 ---
    await transporter.sendMail({
      from: `${process.env.FROM_NAME} <${process.env.FROM_EMAIL}>`,
      to: email,
      replyTo: `${process.env.REPLY_TO_NAME} <${process.env.FROM_EMAIL}>`,
      subject: currentDoc.subject,
      html: fullBody,
      attachments: [{ filename: path.basename(currentDoc.file_path), path: currentDoc.file_path }],
    });

    res.writeHead(302, { Location: '/drop/Checklist-Sent.html' });
    res.end();

  } catch (error) {
    console.error(`Mail error for ${email} [${docType}]:`, error);
    res.writeHead(302, { Location: '/drop/error.html' });
    res.end();
  }
}

// ✅ 辅助函数：邮箱验证
function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
