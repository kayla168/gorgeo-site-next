// File: /api/technical-inquiry.js
// ✅ 支持 formidable v3+ / nodemailer
// ✅ 与 PHP 版本逻辑与邮件文案完全保持一致
// ✅ 支持附件上传 + 校验 + 自动回复客户邮件

import { formidable } from 'formidable';
import nodemailer from 'nodemailer';

export const config = {
  api: { bodyParser: false },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  // ✅ 允许空文件上传（否则会报 allowEmptyFiles 错误）
  const form = formidable({
    multiples: false,
    maxFileSize: 5 * 1024 * 1024, // 5MB
    allowEmptyFiles: true,
    minFileSize: 0,               // ✅ 明确设置允许 0 字节文件
  });

  let fields, files;
  try {
    [fields, files] = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve([fields, files]);
      });
    });
  } catch (err) {
    console.error('❌ Form parse error:', err);
    return res.status(500).json({ error: 'Form parsing failed' });
  }

  const { name, email, company = '', message = '' } = fields;

  if (!name || !email || !message || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Missing or invalid fields' });
  }

  // ✅ SMTP 配置（与 .env / Vercel 环境变量一致）
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '465'),
    secure: true,
    auth: {
      user: process.env.SMTP_USERNAME,
      pass: process.env.SMTP_PASSWORD,
    },
  });

  // ✅ 邮件签名
  const signature = `
    Best regards,<br>
    <strong>Catherine Zhang</strong><br>
    <span>Senior Assembly Fit Consultant</span><br>
    <span>Structural Fit Reliability · ±0.01 mm</span><br>
    <span>Gorgeo Fasteners | Sleeves · Pins · Locator Bolts</span>
  `;

  // ✅ 自动回复正文
  const autoReplyBody = `
    <div style='font-family: Calibri, sans-serif; font-size: 11pt; color: #333; line-height: 1.5;'>
      <p>Hi ${name},</p>
      <p>This is an automatic confirmation that we have successfully received your inquiry and any attached drawings. Thank you for reaching out.</p>
      <p>Our engineering team will personally review your message and get back to you within one business day. Please rest assured that all submitted files are handled with complete confidentiality.</p>
      <hr style='border: none; border-top: 1px solid #eee; margin: 20px 0;'>
      <p><strong>While you wait, explore how we solve similar challenges:</strong></p>
      <ul style='padding-left: 0; list-style: none;'>
        <li style='margin-bottom: 10px;'>
          <a href='https://www.gorgeofasteners.com/blog/vibration-loosening-fix/vibration-loosening-fix.html' style='color: #007bff; text-decoration: none;'>
            <strong>Case Study: Fixing Chronic Vibration Loosening</strong><br>
            <span style='color: #555; font-size: 0.9em;'>How we use structural geometry, not just torque, to create joints that never back out.</span>
          </a>
        </li>
        <li>
          <a href='https://www.gorgeofasteners.com/blog/coating-induced-jam-fit/coating-induced-jam-fit.html' style='color: #007bff; text-decoration: none;'>
            <strong>Teardown: When a 0.05mm Coating Jams Assembly</strong><br>
            <span style='color: #555; font-size: 0.9em;'>Dissecting how an unmodeled finish layer can turn a perfect CAD fit into a production-line failure.</span>
          </a>
        </li>
      </ul>
      <br>
      <p>${signature}</p>
      <p style='font-size: 0.85em; color: #777; margin-top: 25px;'>
        P.S. If you need to add any information to your inquiry, simply reply to this email. For truly urgent matters, you can find our direct contact details on our website.
      </p>
    </div>
  `;

  try {
    // ✅ 发邮件给管理员
    const adminMail = {
      from: `${name} (Website Inquiry) <${process.env.FROM_EMAIL}>`,
      to: process.env.FROM_EMAIL,
      replyTo: `${name} <${email}>`,
      subject: `New Technical Inquiry from ${name}${company ? ` (${company})` : ''}`,
      html: `
        <strong>Name:</strong> ${name}<br>
        <strong>Email:</strong> ${email}<br>
        <strong>Company:</strong> ${company}<br>
        <strong>Message:</strong><br>${message}
      `,
      attachments: [],
    };

    // ✅ 文件检查
    if (files.drawing && files.drawing[0]) {
      const drawing = files.drawing[0];
      const allowed = ['pdf','dwg','dxf','step','stp','iges','igs','jpg','jpeg','png','zip','rar'];
      const ext = drawing.originalFilename.split('.').pop().toLowerCase();

      if (allowed.includes(ext) && drawing.size > 0 && drawing.size <= 5 * 1024 * 1024) {
        adminMail.attachments.push({
          filename: drawing.originalFilename,
          path: drawing.filepath,
        });
      }
    }

    await transporter.sendMail(adminMail);
    console.log('✅ Admin mail sent to', process.env.FROM_EMAIL);

    // ✅ 自动回复客户
    await transporter.sendMail({
      from: `${process.env.REPLY_TO_NAME} | Gorgeo Fasteners <${process.env.FROM_EMAIL}>`,
      to: email,
      subject: `Confirmation: We've received your inquiry [Analysis in Progress]`,
      html: autoReplyBody,
    });

    console.log('✅ Auto-reply sent to', email);
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('❌ Mail send failed:', error);
    return res.status(500).json({ error: 'Mail send failed' });
  }
}


