import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export type RelatorioPayload = {
  tipo: "faturamento" | "funil" | "inadimplencia" | "pipeline" | "geral";
  titulo: string;
  resumo: string;
  kpis: { label: string; valor: string }[];
  tabela?: { colunas: string[]; linhas: string[][] };
  insights: string[];
};

export function gerarRelatorioPDF(rel: RelatorioPayload, contexto?: { tenant?: string; usuario?: string; periodo?: string }) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 40;
  let y = 50;

  // Header brand bar
  doc.setFillColor(232, 88, 23); // primary orange
  doc.rect(0, 0, pageWidth, 8, "F");

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(20, 20, 25);
  doc.text(rel.titulo, margin, y);
  y += 10;

  // Subtitle / meta
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(120, 120, 130);
  const meta = [
    `Gerado pela Launch · ${new Date().toLocaleString("pt-BR")}`,
    contexto?.tenant ? `Empresa: ${contexto.tenant}` : null,
    contexto?.periodo ? `Período: ${contexto.periodo}` : null,
  ].filter(Boolean).join("  ·  ");
  doc.text(meta, margin, y + 12);
  y += 30;

  // Resumo
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(40, 40, 45);
  doc.text("Resumo executivo", margin, y);
  y += 14;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(60, 60, 65);
  const lines = doc.splitTextToSize(rel.resumo, pageWidth - margin * 2);
  doc.text(lines, margin, y);
  y += lines.length * 13 + 16;

  // KPIs
  if (rel.kpis?.length) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(40, 40, 45);
    doc.text("Indicadores", margin, y);
    y += 12;
    const cardW = (pageWidth - margin * 2 - 10 * (rel.kpis.length - 1)) / rel.kpis.length;
    rel.kpis.forEach((k, i) => {
      const x = margin + i * (cardW + 10);
      doc.setDrawColor(230, 230, 235);
      doc.setFillColor(248, 248, 250);
      doc.roundedRect(x, y, cardW, 50, 6, 6, "FD");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 130);
      doc.text(k.label.toUpperCase(), x + 10, y + 14);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(232, 88, 23);
      doc.text(k.valor, x + 10, y + 34);
    });
    y += 66;
  }

  // Tabela
  if (rel.tabela?.linhas?.length) {
    autoTable(doc, {
      startY: y,
      head: [rel.tabela.colunas],
      body: rel.tabela.linhas,
      margin: { left: margin, right: margin },
      styles: { fontSize: 9, cellPadding: 6 },
      headStyles: { fillColor: [232, 88, 23], textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [248, 248, 250] },
    });
    y = (doc as any).lastAutoTable.finalY + 18;
  }

  // Insights
  if (rel.insights?.length) {
    if (y > 700) { doc.addPage(); y = 50; }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(40, 40, 45);
    doc.text("Insights do Launch", margin, y);
    y += 14;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 65);
    rel.insights.forEach((ins) => {
      const wrapped = doc.splitTextToSize(`• ${ins}`, pageWidth - margin * 2);
      if (y + wrapped.length * 13 > 780) { doc.addPage(); y = 50; }
      doc.text(wrapped, margin, y);
      y += wrapped.length * 13 + 4;
    });
  }

  // Footer
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 155);
    doc.text(`Align CRM · Launch · pág ${i}/${total}`, pageWidth - margin, 820, { align: "right" });
  }

  return doc;
}

export function downloadRelatorioPDF(rel: RelatorioPayload, contexto?: Parameters<typeof gerarRelatorioPDF>[1]) {
  const doc = gerarRelatorioPDF(rel, contexto);
  const safeName = rel.titulo.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 60);
  doc.save(`${safeName || "relatorio-kassia"}.pdf`);
}

export function previewRelatorioPDF(rel: RelatorioPayload, contexto?: Parameters<typeof gerarRelatorioPDF>[1]): string {
  const doc = gerarRelatorioPDF(rel, contexto);
  return doc.output("dataurlstring");
}
