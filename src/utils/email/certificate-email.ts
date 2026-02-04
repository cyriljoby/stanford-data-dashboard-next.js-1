import "server-only";
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL!,
    pass: process.env.EMAIL_PASSWORD!,
  },
});

export async function sendFormCompletionEmail(
  teacherEmail: string,
  teacherName: string,
  formTitle: string,
  completionDate: Date,
  studentName?: string,
  certificatePdf?: Buffer
) {
  const today = completionDate.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const subject = `Form Completed: ${formTitle}`;

  // Use student name if provided, otherwise say "A student"
  const studentText = studentName || "A student";

  const html = `
    <p>Hello ,</p>
    <p>${studentText} has completed ${formTitle} on ${today}.</p>
    ${certificatePdf ? "<p>Please find the certificate of completion attached.</p>" : ""}
    <p>Best regards,<br/>The REACH Lab Team</p>
  `;

  const text = `Hello,\n\n${studentText} has completed ${formTitle} on ${today}.\n\n${certificatePdf ? "Please find the certificate of completion attached.\n\n" : ""}Best regards,\nThe REACH Lab Team`;

  const mailOptions: any = {
    from: process.env.MAIL_FROM ?? `REACH Lab <${process.env.EMAIL}>`,
    to: teacherEmail,
    subject,
    html,
    text,
  };

  // Add PDF attachment if provided
  if (certificatePdf) {
    mailOptions.attachments = [
      {
        filename: `${studentName || "Student"}_Certificate.pdf`,
        content: certificatePdf,
        contentType: "application/pdf",
      },
    ];
  }

  await transporter.sendMail(mailOptions);
}
