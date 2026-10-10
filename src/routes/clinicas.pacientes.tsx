import { pageHead } from "@/lib/page-head";
import { Button } from "@/components/ui/button";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Search, Phone, Mail, Calendar, Loader2, Stethoscope } from "@/components/ui/icons";
import { usePatients, useUpsertPatient, type Patient } from "@/hooks/use-clinic";
import { PrimaryButton, StatusPill } from "@/components/app-shell";
import { PatientDrawer } from "@/components/patient-drawer";

export const Route = createFileRoute("/clinicas/pacientes")({
  head: () => pageHead("Clinicas · Pacientes"),
  component: PacientesPage,
});

function PacientesPage() {
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Patient | null>(null);
  const [creating, setCreating] = useState(false);
  const { data: patients = [], isLoading } = usePatients(search);
  const upsert = useUpsertPatient();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, CPF, WhatsApp ou e-mail..."
            className="h-10 w-full rounded-lg border border-border bg-surface-1 pl-10 pr-3 text-sm placeholder:text-muted-foreground focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <PrimaryButton icon={Plus} onClick={() => setCreating(true)}>Novo paciente</PrimaryButton>
      </div>

      <div className="rounded-xl border border-border bg-surface-1 shadow-card">
        {isLoading ? (
          <div className="grid place-items-center py-16"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
        ) : patients.length === 0 ? (
          <div className="grid place-items-center gap-3 py-16 text-center">
            <div className="grid h-12 w-12 place-items-center rounded-full bg-primary/10"><Stethoscope className="h-5 w-5 text-primary" /></div>
            <div>
              <p className="text-sm font-medium">Nenhum paciente cadastrado</p>
              <p className="mt-1 text-xs text-muted-foreground">Adicione o primeiro paciente para começar a gerenciar sua clínica.</p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {patients.map((p) => (
              <Button variant="unstyled" size="unstyled"
                key={p.id}
                onClick={() => setEditing(p)}
                className="flex w-full items-center gap-4 px-5 py-3.5 text-left transition hover:bg-surface-2"
              >
                <div className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-primary/30 to-primary/10 text-sm font-semibold text-primary">
                  {p.nome.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase()}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{p.nome}</span>
                    {p.convenio && <span className="rounded-full bg-surface-3 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">{p.convenio}</span>}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    {p.whatsapp && <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />{p.whatsapp}</span>}
                    {p.email && <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" />{p.email}</span>}
                    {p.ultimo_atendimento_em && (
                      <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" />Último: {new Date(p.ultimo_atendimento_em).toLocaleDateString("pt-BR")}</span>
                    )}
                  </div>
                </div>
                <StatusPill tone={p.status === "ativo" ? "success" : p.status === "bloqueado" ? "danger" : "neutral"}>{p.status}</StatusPill>
              </Button>
            ))}
          </div>
        )}
      </div>

      {(creating || editing) && (
        <PatientDrawer
          patient={editing}
          onClose={() => { setEditing(null); setCreating(false); }}
          onSave={async (data) => {
            await upsert.mutateAsync(editing ? { ...data, id: editing.id } : data);
            setEditing(null);
            setCreating(false);
          }}
        />
      )}
    </div>
  );
}
