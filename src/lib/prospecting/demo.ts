/**
 * Dados simulados só podem ser importados em desenvolvimento e mediante opt-in.
 * A proteção definitiva também é aplicada no backend de importação.
 */
export function canImportDemoData(): boolean {
  return import.meta.env.DEV && import.meta.env.VITE_PROSPECTING_ALLOW_DEMO_IMPORT === "true";
}

export function canImportProspectingResult(result: { status: string; is_demo: boolean }): boolean {
  if (result.status === "importado") return false;
  return !result.is_demo || canImportDemoData();
}
