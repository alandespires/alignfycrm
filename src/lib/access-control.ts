export type TenantSegment = "geral" | "clinica" | "escolar";

export function canAccessPath(pathname: string, segment: TenantSegment, isSuperAdmin: boolean): boolean {
  if (pathname.startsWith("/super-admin")) return isSuperAdmin;
  if (pathname.startsWith("/clinicas")) return segment === "clinica";
  if (pathname.startsWith("/escolar") || pathname.startsWith("/portal-aluno")) return segment === "escolar";
  return true;
}
