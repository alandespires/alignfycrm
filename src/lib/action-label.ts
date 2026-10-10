export type ActionSymbol = "add" | "save" | "close" | "delete" | "edit" | "download" | "upload" | "send" | "refresh" | "filter" | "clear" | "open" | "copy" | "check" | "play" | "star";

export function actionSymbol(label: string): ActionSymbol | undefined {
  const text = label.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (/^(novo\b|nova\b|novos\b|adicionar\b|criar\b|convidar\b|registrar\b)/.test(text)) return "add";
  if (/^(salvar\b|salvando|aplicar\b|confirmar\b)/.test(text)) return "save";
  if (/^(cancelar\b|fechar\b|voltar\b)/.test(text)) return "close";
  if (/^(excluir\b|remover\b|apagar\b)/.test(text)) return "delete";
  if (/^editar\b/.test(text)) return "edit";
  if (/^(exportar\b|baixar\b|download\b)/.test(text)) return "download";
  if (/^(importar\b|importacao\b|enviar arquivo\b)/.test(text)) return "upload";
  if (/^(enviar\b|simular\b|converter\b)/.test(text)) return "send";
  if (/^(atualizar\b|recarregar\b|tentar novamente\b|recalcular\b)/.test(text)) return "refresh";
  if (/^filtr(os|ar)\b/.test(text)) return "filter";
  if (/^(limpar\b|redefinir\b|restaurar\b)/.test(text)) return "clear";
  if (/^(abrir\b|ver\b|visualizar\b)/.test(text)) return "open";
  if (/^copiar\b/.test(text)) return "copy";
  if (/^(concluir\b|aprovar\b|marcar\b)/.test(text)) return "check";
  if (/^(iniciar\b|executar\b|ativar\b)/.test(text)) return "play";
  if (/^favoritar\b/.test(text)) return "star";
  return undefined;
}