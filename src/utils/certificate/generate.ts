import { PDFDocument, rgb } from "pdf-lib";

export interface CertificateData {
  studentName: string;
  formTitle: string;
  completionDate: Date;
}

export async function generateCertificate(
  data: CertificateData,
): Promise<Buffer> {
  // Create a new PDF document
  const pdfDoc = await PDFDocument.create();

  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000";

  const templateUrl = `${baseUrl}/StanfordReachLabHealthyFuturesCert.png`;
  console.log(templateUrl);
  const res = await fetch(templateUrl);
  if (!res.ok) {
    throw new Error(`Failed to fetch certificate template: ${res.status}`);
  }

  const imageBytes = await res.arrayBuffer();
  const image = await pdfDoc.embedPng(imageBytes);

  // Get image dimensions
  const imageDims = image.scale(1);

  // Add a page with the same dimensions as the image
  const page = pdfDoc.addPage([imageDims.width, imageDims.height]);

  // Draw the certificate template
  page.drawImage(image, {
    x: 0,
    y: 0,
    width: imageDims.width,
    height: imageDims.height,
  });

  // Format the date
  const dateStr = data.completionDate.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  // Add student name (adjust x, y coordinates based on your template)
  page.drawText(data.studentName, {
    x: imageDims.width / 2 - 100, // Center horizontally (adjust as needed)
    y: imageDims.height / 2 - 70, // Moved down from center
    size: 50,
    color: rgb(0, 0, 0),
  });

  // Add date (adjust x, y coordinates based on your template)
  page.drawText(dateStr, {
    x: imageDims.width / 2 + 150, // Moved to the right
    y: imageDims.height / 2 - 230, // Moved down
    size: 30,
    color: rgb(0, 0, 0),
  });

  // Serialize the PDF to bytes
  const pdfBytes = await pdfDoc.save();

  return Buffer.from(pdfBytes);
}
