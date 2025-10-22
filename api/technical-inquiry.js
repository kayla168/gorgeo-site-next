// File: /api/technical-inquiry.js
import { formidable } from 'formidable';
import nodemailer from 'nodemailer';

export const config = {
  api: { bodyParser: false },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'text/plain' });
    res.end('Method Not Allowed');
    return;
  }

  // ✅ Formidable 设置：允许空文件 & 限制文件大小
  const form = formidable({
    multiples: false,
    maxFileSize: 5 * 1024 * 1024, // 5MB
    allowEmptyFiles: true,
    minFileSize: 0,
  });

  try {
    const [fields, files] = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve([fields, files]);
      });
    });

    const name = fields.name?.[0] || '';
    const email = fields.email?.[0] || '';
    const company = fields.company?.[0] || '';
    const message = fields.message?.[0] || '';

    if (!name || !email || !message) {
      res.writeHead(302, { Location: '/contact/error.html' });
      res.end();
      return;
    }

    // ✅ 邮件传输配置（与 Vercel 环境变量对应）
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT, 10),
      secure: true,
      auth: {
        user: process.env.SMTP_USERNAME,
        pass: process.env.SMTP_PASSWORD,
      },
    });

    const signature = `
      Best regards,<br>
      <strong>Catherine Zhang</strong><br>
      <span>Senior Assembly Fit Consultant</span><br>
      <span>Structural Fit Reliability · ±0.01 mm</span><br>
      <span>Gorgeo Fasteners | Sleeves · Pins · Locator Bolts</span>
    `;

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

    // ✅ 管理员邮件内容
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

    // ✅ 附件处理（判断文件存在且非空）
    const drawing = files.drawing?.[0];
    if (drawing && drawing.size > 0) {
      const allowedExts = ['pdf', 'dwg', 'dxf', 'step', 'stp', 'iges', 'igs', 'jpg', 'jpeg', 'png', 'zip', 'rar'];
      const ext = drawing.originalFilename.split('.').pop().toLowerCase();
      if (allowedExts.includes(ext)) {
        adminMail.attachments.push({
          filename: drawing.originalFilename,
          path: drawing.filepath,
        });
      }
    }

    // ✅ 发送管理员邮件
    await transporter.sendMail(adminMail);

    // ✅ 自动回复客户邮件
    await transporter.sendMail({
      from: `${process.env.REPLY_TO_NAME} | Gorgeo Fasteners <${process.env.FROM_EMAIL}>`,
      to: email,
      subject: `Confirmation: We've received your inquiry [Analysis in Progress]`,
      html: autoReplyBody,
    });

    // ✅ 成功跳转
    res.writeHead(302, { Location: '/contact/thank-you.html' });
    res.end();

  } catch (err) {
    console.error('❌ Mail send failed:', err);
    res.writeHead(302, { Location: '/contact/error.html' });
    res.end();
  }
}
