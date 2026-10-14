import PDFDocument from "pdfkit";
import { CLUB_NAME } from "./email.js";

const METHOD_LABELS = { transfer: "Transferência bancária", cash: "Numerário", mbway: "MB WAY", card: "Cartão" };

const euros = (value) => `${Number(value).toFixed(2).replace(".", ",")} €`;
const ptDate = (value) => new Date(value).toLocaleDateString("pt-PT", { timeZone: "Europe/Lisbon" });

// Payment (with member.user and membership) -> PDF receipt, streamed to `res`.
// The club's details come from CLUB_NAME, CLUB_NIF and CLUB_ADDRESS.
export function streamReceiptPdf(payment, res) {
  const doc = new PDFDocument({ size: "A4", margin: 56, info: { Title: `Recibo ${payment.receiptNumber}`, Author: CLUB_NAME } });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename="recibo-${payment.receiptNumber}.pdf"`);
  doc.pipe(res);

  const user = payment.member.user;
  const description = payment.membership
    ? `Quota anual ${payment.membership.year}`
    : payment.notes || "Pagamento";

  doc.font("Helvetica-Bold").fontSize(18).text(CLUB_NAME);
  doc.font("Helvetica").fontSize(10).fillColor("#555555");
  if (process.env.CLUB_ADDRESS) doc.text(process.env.CLUB_ADDRESS);
  if (process.env.CLUB_NIF) doc.text(`NIF ${process.env.CLUB_NIF}`);
  doc.moveDown(2).fillColor("#000000");

  doc.font("Helvetica-Bold").fontSize(16).text(`Recibo n.º ${payment.receiptNumber}`);
  doc.font("Helvetica").fontSize(11).text(`Data: ${ptDate(payment.date)}`);
  doc.moveDown(1.5);

  const row = (label, value) => {
    doc.font("Helvetica-Bold").text(`${label}: `, { continued: true }).font("Helvetica").text(value ?? "—");
  };
  row("Recebido de", user.name);
  row("Sócio n.º", String(payment.member.memberNumber));
  row("NIF", user.nif || "—");
  doc.moveDown();
  row("Descrição", description);
  row("Método de pagamento", METHOD_LABELS[payment.method] || payment.method);
  if (payment.reference) row("Referência", payment.reference);
  doc.moveDown();
  doc.font("Helvetica-Bold").fontSize(14).text(`Valor recebido: ${euros(payment.paidAmount)}`);

  doc.moveDown(3).font("Helvetica").fontSize(9).fillColor("#555555")
    .text(`Documento emitido por ${CLUB_NAME} a partir do registo de pagamentos.`);
  doc.end();
}
