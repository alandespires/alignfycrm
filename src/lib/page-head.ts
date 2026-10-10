export function pageHead(title: string, description = `${title} no Align CRM. Organize sua operação e acompanhe seus registros em um só lugar.`) {
  const fullTitle = `${title} — Align CRM`;
  return { meta: [
    { title: fullTitle },
    { name: "description", content: description },
    { property: "og:title", content: fullTitle },
    { property: "og:description", content: description },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] };
}