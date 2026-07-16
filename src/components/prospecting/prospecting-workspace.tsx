import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ProspectingFilters, ProspectingSearch } from "@/lib/prospecting/types";
import {
  useAddResultsToList,
  useCreateProspectingList,
  useDeleteProspectingProfile,
  useDeleteProspectingSearch,
  useProspectingLists,
  useProspectingProfiles,
  useSaveProfile,
} from "@/hooks/use-prospecting";
import { History, Layers, Play, Save, Trash2 } from "lucide-react";
import { ProspectingSettings } from "./prospecting-settings";

export function ProspectingWorkspace({
  filters,
  searches,
  selectedIds,
  onOpenSearch,
  onRunFilters,
  canManage,
}: {
  filters: ProspectingFilters;
  searches: ProspectingSearch[];
  selectedIds: string[];
  onOpenSearch: (id: string) => void;
  onRunFilters: (filters: ProspectingFilters) => void;
  canManage: boolean;
}) {
  const { data: profiles = [] } = useProspectingProfiles();
  const { data: lists = [] } = useProspectingLists();
  const saveProfile = useSaveProfile();
  const deleteProfile = useDeleteProspectingProfile();
  const deleteSearch = useDeleteProspectingSearch();
  const createList = useCreateProspectingList();
  const addToList = useAddResultsToList();
  const [profileName, setProfileName] = useState("");
  const [listName, setListName] = useState("");
  const [selectedList, setSelectedList] = useState("");

  return (
    <Tabs
      defaultValue="historico"
      className="rounded-2xl border border-border bg-surface-2 p-4 shadow-card"
    >
      <TabsList>
        <TabsTrigger value="historico">Histórico</TabsTrigger>
        <TabsTrigger value="perfis">Perfis</TabsTrigger>
        <TabsTrigger value="listas">Listas</TabsTrigger>
        {canManage && <TabsTrigger value="configuracoes">Configurações</TabsTrigger>}
      </TabsList>

      <TabsContent value="historico" className="mt-4 space-y-2">
        {!searches.length && <Empty text="Nenhuma pesquisa registrada." />}
        {searches.map((search) => (
          <div
            key={search.id}
            className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface-1 p-3 text-sm"
          >
            <History className="h-4 w-4 text-muted-foreground" />
            <button onClick={() => onOpenSearch(search.id)} className="min-w-0 flex-1 text-left">
              <div className="truncate font-medium">{search.nome ?? "Pesquisa sem nome"}</div>
              <div className="text-xs text-muted-foreground">
                {new Date(search.created_at).toLocaleString("pt-BR")} · {search.qualificados}/
                {search.encontrados} qualificados · {search.status}
              </div>
            </button>
            <button
              onClick={() => onRunFilters(search.filtros)}
              title="Executar novamente"
              className="grid h-8 w-8 place-items-center rounded-lg hover:bg-surface-3"
            >
              <Play className="h-4 w-4" />
            </button>
            {canManage && (
              <button
                onClick={() => deleteSearch.mutate(search.id)}
                title="Excluir"
                className="grid h-8 w-8 place-items-center rounded-lg text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
      </TabsContent>

      <TabsContent value="perfis" className="mt-4 space-y-3">
        <div className="flex gap-2">
          <input
            value={profileName}
            onChange={(event) => setProfileName(event.target.value)}
            placeholder="Nome do perfil"
            className="h-10 flex-1 rounded-lg border border-border bg-surface-1 px-3 text-sm"
          />
          <button
            onClick={() =>
              saveProfile.mutate(
                { nome: profileName.trim(), filtros: filters },
                { onSuccess: () => setProfileName("") },
              )
            }
            disabled={!profileName.trim() || saveProfile.isPending}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            Salvar filtros atuais
          </button>
        </div>
        {profiles.map((profile: any) => (
          <div
            key={profile.id}
            className="flex items-center gap-3 rounded-xl border border-border bg-surface-1 p-3 text-sm"
          >
            <Save className="h-4 w-4 text-muted-foreground" />
            <div className="flex-1">
              <div className="font-medium">{profile.nome}</div>
              <div className="text-xs text-muted-foreground">
                {profile.descricao ?? "Perfil salvo"}
              </div>
            </div>
            <button
              onClick={() => onRunFilters(profile.filtros)}
              className="grid h-8 w-8 place-items-center rounded-lg hover:bg-surface-3"
              title="Executar"
            >
              <Play className="h-4 w-4" />
            </button>
            <button
              onClick={() => deleteProfile.mutate(profile.id)}
              className="grid h-8 w-8 place-items-center rounded-lg text-destructive hover:bg-destructive/10"
              title="Excluir"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </TabsContent>

      <TabsContent value="listas" className="mt-4 space-y-3">
        <div className="flex gap-2">
          <input
            value={listName}
            onChange={(event) => setListName(event.target.value)}
            placeholder="Nome da nova lista"
            className="h-10 flex-1 rounded-lg border border-border bg-surface-1 px-3 text-sm"
          />
          <button
            onClick={() =>
              createList.mutate(
                { nome: listName.trim() },
                {
                  onSuccess: (list: any) => {
                    setListName("");
                    setSelectedList(list.id);
                  },
                },
              )
            }
            disabled={!listName.trim()}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-border px-4 text-sm disabled:opacity-50"
          >
            <Layers className="h-4 w-4" />
            Criar lista
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            value={selectedList}
            onChange={(event) => setSelectedList(event.target.value)}
            className="h-10 min-w-56 rounded-lg border border-border bg-surface-1 px-3 text-sm"
          >
            <option value="">Selecione uma lista</option>
            {lists.map((list: any) => (
              <option key={list.id} value={list.id}>
                {list.nome}
              </option>
            ))}
          </select>
          <button
            onClick={() => addToList.mutate({ listId: selectedList, resultIds: selectedIds })}
            disabled={!selectedList || !selectedIds.length}
            className="h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            Adicionar selecionados ({selectedIds.length})
          </button>
        </div>
        {lists.map((list: any) => (
          <div key={list.id} className="rounded-xl border border-border bg-surface-1 p-3 text-sm">
            <div className="font-medium">{list.nome}</div>
            <div className="text-xs text-muted-foreground">
              {list.descricao ?? "Lista de prospecção"}
            </div>
          </div>
        ))}
      </TabsContent>
      {canManage && (
        <TabsContent value="configuracoes" className="mt-4">
          <ProspectingSettings />
        </TabsContent>
      )}
    </Tabs>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="py-8 text-center text-sm text-muted-foreground">{text}</div>;
}
