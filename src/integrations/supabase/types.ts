export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      activities: {
        Row: {
          client_id: string | null
          created_at: string
          descricao: string
          id: string
          lead_id: string | null
          metadata: Json | null
          tenant_id: string
          tipo: Database["public"]["Enums"]["activity_type"]
          user_id: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          descricao: string
          id?: string
          lead_id?: string | null
          metadata?: Json | null
          tenant_id: string
          tipo: Database["public"]["Enums"]["activity_type"]
          user_id: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          descricao?: string
          id?: string
          lead_id?: string | null
          metadata?: Json | null
          tenant_id?: string
          tipo?: Database["public"]["Enums"]["activity_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activities_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_insights: {
        Row: {
          conteudo: string
          created_at: string
          id: string
          lead_id: string | null
          lido: boolean | null
          prioridade: Database["public"]["Enums"]["task_priority"] | null
          tenant_id: string
          tipo: string
          titulo: string
        }
        Insert: {
          conteudo: string
          created_at?: string
          id?: string
          lead_id?: string | null
          lido?: boolean | null
          prioridade?: Database["public"]["Enums"]["task_priority"] | null
          tenant_id: string
          tipo: string
          titulo: string
        }
        Update: {
          conteudo?: string
          created_at?: string
          id?: string
          lead_id?: string | null
          lido?: boolean | null
          prioridade?: Database["public"]["Enums"]["task_priority"] | null
          tenant_id?: string
          tipo?: string
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_insights_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_insights_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          confirmado_em: string | null
          convenio: string | null
          cor: string | null
          created_at: string
          created_by: string
          duracao_min: number | null
          fim: string
          id: string
          inicio: string
          lembrete_enviado: boolean
          motivo_cancelamento: string | null
          observacoes: string | null
          patient_id: string
          procedimento: string | null
          professional_id: string | null
          realizado_em: string | null
          status: Database["public"]["Enums"]["appointment_status"]
          tenant_id: string
          updated_at: string
          valor: number | null
        }
        Insert: {
          confirmado_em?: string | null
          convenio?: string | null
          cor?: string | null
          created_at?: string
          created_by: string
          duracao_min?: number | null
          fim: string
          id?: string
          inicio: string
          lembrete_enviado?: boolean
          motivo_cancelamento?: string | null
          observacoes?: string | null
          patient_id: string
          procedimento?: string | null
          professional_id?: string | null
          realizado_em?: string | null
          status?: Database["public"]["Enums"]["appointment_status"]
          tenant_id: string
          updated_at?: string
          valor?: number | null
        }
        Update: {
          confirmado_em?: string | null
          convenio?: string | null
          cor?: string | null
          created_at?: string
          created_by?: string
          duracao_min?: number | null
          fim?: string
          id?: string
          inicio?: string
          lembrete_enviado?: boolean
          motivo_cancelamento?: string | null
          observacoes?: string | null
          patient_id?: string
          procedimento?: string | null
          professional_id?: string | null
          realizado_em?: string | null
          status?: Database["public"]["Enums"]["appointment_status"]
          tenant_id?: string
          updated_at?: string
          valor?: number | null
        }
        Relationships: []
      }
      automation_runs: {
        Row: {
          automation_id: string
          created_at: string
          id: string
          lead_id: string | null
          resultado: Json | null
          tenant_id: string
        }
        Insert: {
          automation_id: string
          created_at?: string
          id?: string
          lead_id?: string | null
          resultado?: Json | null
          tenant_id: string
        }
        Update: {
          automation_id?: string
          created_at?: string
          id?: string
          lead_id?: string | null
          resultado?: Json | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_runs_automation_id_fkey"
            columns: ["automation_id"]
            isOneToOne: false
            referencedRelation: "automations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_runs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_runs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      automations: {
        Row: {
          acoes: Json
          ativo: boolean
          created_at: string
          created_by: string
          descricao: string | null
          execucoes: number
          id: string
          nome: string
          tenant_id: string
          trigger_tipo: Database["public"]["Enums"]["automation_trigger"]
          trigger_valor: string | null
          updated_at: string
        }
        Insert: {
          acoes?: Json
          ativo?: boolean
          created_at?: string
          created_by: string
          descricao?: string | null
          execucoes?: number
          id?: string
          nome: string
          tenant_id: string
          trigger_tipo: Database["public"]["Enums"]["automation_trigger"]
          trigger_valor?: string | null
          updated_at?: string
        }
        Update: {
          acoes?: Json
          ativo?: boolean
          created_at?: string
          created_by?: string
          descricao?: string | null
          execucoes?: number
          id?: string
          nome?: string
          tenant_id?: string
          trigger_tipo?: Database["public"]["Enums"]["automation_trigger"]
          trigger_valor?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "automations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          contrato_inicio: string | null
          contrato_valor: number | null
          created_at: string
          email: string | null
          empresa: string | null
          id: string
          lead_id: string | null
          nome: string
          observacoes: string | null
          owner_id: string | null
          tenant_id: string
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          contrato_inicio?: string | null
          contrato_valor?: number | null
          created_at?: string
          email?: string | null
          empresa?: string | null
          id?: string
          lead_id?: string | null
          nome: string
          observacoes?: string | null
          owner_id?: string | null
          tenant_id: string
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          contrato_inicio?: string | null
          contrato_valor?: number | null
          created_at?: string
          email?: string | null
          empresa?: string | null
          id?: string
          lead_id?: string | null
          nome?: string
          observacoes?: string | null
          owner_id?: string | null
          tenant_id?: string
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      clinical_attachments: {
        Row: {
          created_at: string
          created_by: string
          descricao: string | null
          id: string
          nome: string
          patient_id: string
          record_id: string | null
          tamanho_bytes: number | null
          tenant_id: string
          tipo: string | null
          url: string
        }
        Insert: {
          created_at?: string
          created_by: string
          descricao?: string | null
          id?: string
          nome: string
          patient_id: string
          record_id?: string | null
          tamanho_bytes?: number | null
          tenant_id: string
          tipo?: string | null
          url: string
        }
        Update: {
          created_at?: string
          created_by?: string
          descricao?: string | null
          id?: string
          nome?: string
          patient_id?: string
          record_id?: string | null
          tamanho_bytes?: number | null
          tenant_id?: string
          tipo?: string | null
          url?: string
        }
        Relationships: []
      }
      clinical_records: {
        Row: {
          conteudo: string
          created_at: string
          created_by: string
          dente: string | null
          id: string
          metadata: Json | null
          patient_id: string
          procedimento: string | null
          professional_id: string | null
          queixa_principal: string | null
          tenant_id: string
          tipo: Database["public"]["Enums"]["clinical_record_type"]
          titulo: string | null
          updated_at: string
        }
        Insert: {
          conteudo: string
          created_at?: string
          created_by: string
          dente?: string | null
          id?: string
          metadata?: Json | null
          patient_id: string
          procedimento?: string | null
          professional_id?: string | null
          queixa_principal?: string | null
          tenant_id: string
          tipo?: Database["public"]["Enums"]["clinical_record_type"]
          titulo?: string | null
          updated_at?: string
        }
        Update: {
          conteudo?: string
          created_at?: string
          created_by?: string
          dente?: string | null
          id?: string
          metadata?: Json | null
          patient_id?: string
          procedimento?: string | null
          professional_id?: string | null
          queixa_principal?: string | null
          tenant_id?: string
          tipo?: Database["public"]["Enums"]["clinical_record_type"]
          titulo?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      companies: {
        Row: {
          cidade: string | null
          cnpj: string | null
          created_at: string
          created_by: string
          estado: string | null
          id: string
          nome: string
          observacoes: string | null
          owner_id: string | null
          razao_social: string | null
          segmento: string | null
          site: string | null
          tamanho: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          cidade?: string | null
          cnpj?: string | null
          created_at?: string
          created_by: string
          estado?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          owner_id?: string | null
          razao_social?: string | null
          segmento?: string | null
          site?: string | null
          tamanho?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          cidade?: string | null
          cnpj?: string | null
          created_at?: string
          created_by?: string
          estado?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          owner_id?: string | null
          razao_social?: string | null
          segmento?: string | null
          site?: string | null
          tamanho?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      consortium_administrators: {
        Row: {
          ativo: boolean
          cnpj: string | null
          contato: string | null
          created_at: string
          created_by: string | null
          fundo_reserva_padrao: number | null
          id: string
          nome: string
          observacoes: string | null
          seguro_padrao: number | null
          taxa_adm_padrao: number | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          cnpj?: string | null
          contato?: string | null
          created_at?: string
          created_by?: string | null
          fundo_reserva_padrao?: number | null
          id?: string
          nome: string
          observacoes?: string | null
          seguro_padrao?: number | null
          taxa_adm_padrao?: number | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          cnpj?: string | null
          contato?: string | null
          created_at?: string
          created_by?: string | null
          fundo_reserva_padrao?: number | null
          id?: string
          nome?: string
          observacoes?: string | null
          seguro_padrao?: number | null
          taxa_adm_padrao?: number | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "consortium_administrators_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      consortium_contemplations: {
        Row: {
          created_at: string
          created_by: string | null
          data: string
          id: string
          observacao: string | null
          quota_id: string
          tenant_id: string
          tipo: Database["public"]["Enums"]["contemplation_type"]
          valor_lance: number | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          data?: string
          id?: string
          observacao?: string | null
          quota_id: string
          tenant_id: string
          tipo: Database["public"]["Enums"]["contemplation_type"]
          valor_lance?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          data?: string
          id?: string
          observacao?: string | null
          quota_id?: string
          tenant_id?: string
          tipo?: Database["public"]["Enums"]["contemplation_type"]
          valor_lance?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "consortium_contemplations_quota_id_fkey"
            columns: ["quota_id"]
            isOneToOne: false
            referencedRelation: "consortium_quotas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consortium_contemplations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      consortium_groups: {
        Row: {
          administrator_id: string | null
          assembleia_dia: number | null
          codigo: string
          created_at: string
          id: string
          observacoes: string | null
          prazo_meses: number
          segmento: Database["public"]["Enums"]["consortium_segment"]
          status: string
          tenant_id: string
          updated_at: string
          vagas: number | null
          valor_credito: number
        }
        Insert: {
          administrator_id?: string | null
          assembleia_dia?: number | null
          codigo: string
          created_at?: string
          id?: string
          observacoes?: string | null
          prazo_meses: number
          segmento: Database["public"]["Enums"]["consortium_segment"]
          status?: string
          tenant_id: string
          updated_at?: string
          vagas?: number | null
          valor_credito: number
        }
        Update: {
          administrator_id?: string | null
          assembleia_dia?: number | null
          codigo?: string
          created_at?: string
          id?: string
          observacoes?: string | null
          prazo_meses?: number
          segmento?: Database["public"]["Enums"]["consortium_segment"]
          status?: string
          tenant_id?: string
          updated_at?: string
          vagas?: number | null
          valor_credito?: number
        }
        Relationships: [
          {
            foreignKeyName: "consortium_groups_administrator_id_fkey"
            columns: ["administrator_id"]
            isOneToOne: false
            referencedRelation: "consortium_administrators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consortium_groups_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      consortium_quotas: {
        Row: {
          administrator_id: string | null
          client_id: string | null
          contemplada_em: string | null
          created_at: string
          created_by: string | null
          group_id: string | null
          id: string
          lance_ofertado: number | null
          lance_tipo: Database["public"]["Enums"]["contemplation_type"] | null
          lead_id: string | null
          numero_cota: string | null
          observacoes: string | null
          owner_id: string | null
          parcela_atual: number | null
          parcela_total: number
          parcela_valor: number
          proximo_vencimento: string | null
          segmento: Database["public"]["Enums"]["consortium_segment"]
          status: Database["public"]["Enums"]["quota_status"]
          tenant_id: string
          updated_at: string
          valor_credito: number
        }
        Insert: {
          administrator_id?: string | null
          client_id?: string | null
          contemplada_em?: string | null
          created_at?: string
          created_by?: string | null
          group_id?: string | null
          id?: string
          lance_ofertado?: number | null
          lance_tipo?: Database["public"]["Enums"]["contemplation_type"] | null
          lead_id?: string | null
          numero_cota?: string | null
          observacoes?: string | null
          owner_id?: string | null
          parcela_atual?: number | null
          parcela_total: number
          parcela_valor: number
          proximo_vencimento?: string | null
          segmento: Database["public"]["Enums"]["consortium_segment"]
          status?: Database["public"]["Enums"]["quota_status"]
          tenant_id: string
          updated_at?: string
          valor_credito: number
        }
        Update: {
          administrator_id?: string | null
          client_id?: string | null
          contemplada_em?: string | null
          created_at?: string
          created_by?: string | null
          group_id?: string | null
          id?: string
          lance_ofertado?: number | null
          lance_tipo?: Database["public"]["Enums"]["contemplation_type"] | null
          lead_id?: string | null
          numero_cota?: string | null
          observacoes?: string | null
          owner_id?: string | null
          parcela_atual?: number | null
          parcela_total?: number
          parcela_valor?: number
          proximo_vencimento?: string | null
          segmento?: Database["public"]["Enums"]["consortium_segment"]
          status?: Database["public"]["Enums"]["quota_status"]
          tenant_id?: string
          updated_at?: string
          valor_credito?: number
        }
        Relationships: [
          {
            foreignKeyName: "consortium_quotas_administrator_id_fkey"
            columns: ["administrator_id"]
            isOneToOne: false
            referencedRelation: "consortium_administrators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consortium_quotas_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consortium_quotas_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "consortium_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consortium_quotas_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consortium_quotas_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      consortium_simulations: {
        Row: {
          administrator_id: string | null
          client_id: string | null
          created_at: string
          created_by: string | null
          credito: number
          enviada_em: string | null
          fundo_reserva: number
          id: string
          lance_embutido_pct: number | null
          lead_id: string | null
          parcela_com_lance: number | null
          parcela_estimada: number
          payload: Json
          pdf_url: string | null
          prazo_meses: number
          segmento: Database["public"]["Enums"]["consortium_segment"]
          seguro_mensal: number | null
          taxa_adm: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          administrator_id?: string | null
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          credito: number
          enviada_em?: string | null
          fundo_reserva?: number
          id?: string
          lance_embutido_pct?: number | null
          lead_id?: string | null
          parcela_com_lance?: number | null
          parcela_estimada: number
          payload?: Json
          pdf_url?: string | null
          prazo_meses: number
          segmento: Database["public"]["Enums"]["consortium_segment"]
          seguro_mensal?: number | null
          taxa_adm: number
          tenant_id: string
          updated_at?: string
        }
        Update: {
          administrator_id?: string | null
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          credito?: number
          enviada_em?: string | null
          fundo_reserva?: number
          id?: string
          lance_embutido_pct?: number | null
          lead_id?: string | null
          parcela_com_lance?: number | null
          parcela_estimada?: number
          payload?: Json
          pdf_url?: string | null
          prazo_meses?: number
          segmento?: Database["public"]["Enums"]["consortium_segment"]
          seguro_mensal?: number | null
          taxa_adm?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "consortium_simulations_administrator_id_fkey"
            columns: ["administrator_id"]
            isOneToOne: false
            referencedRelation: "consortium_administrators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consortium_simulations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consortium_simulations_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consortium_simulations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      consultor_commissions: {
        Row: {
          base: number
          consultor_id: string | null
          created_at: string
          created_by: string | null
          deal_id: string | null
          descricao: string
          financial_entry_id: string | null
          id: string
          lead_id: string | null
          observacoes: string | null
          paga_em: string | null
          pagar_em: string | null
          percentual: number
          quota_id: string | null
          status: Database["public"]["Enums"]["commission_status"]
          tenant_id: string
          updated_at: string
          valor: number
        }
        Insert: {
          base: number
          consultor_id?: string | null
          created_at?: string
          created_by?: string | null
          deal_id?: string | null
          descricao: string
          financial_entry_id?: string | null
          id?: string
          lead_id?: string | null
          observacoes?: string | null
          paga_em?: string | null
          pagar_em?: string | null
          percentual: number
          quota_id?: string | null
          status?: Database["public"]["Enums"]["commission_status"]
          tenant_id: string
          updated_at?: string
          valor: number
        }
        Update: {
          base?: number
          consultor_id?: string | null
          created_at?: string
          created_by?: string | null
          deal_id?: string | null
          descricao?: string
          financial_entry_id?: string | null
          id?: string
          lead_id?: string | null
          observacoes?: string | null
          paga_em?: string | null
          pagar_em?: string | null
          percentual?: number
          quota_id?: string | null
          status?: Database["public"]["Enums"]["commission_status"]
          tenant_id?: string
          updated_at?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "consultor_commissions_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultor_commissions_financial_entry_id_fkey"
            columns: ["financial_entry_id"]
            isOneToOne: false
            referencedRelation: "financial_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultor_commissions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultor_commissions_quota_id_fkey"
            columns: ["quota_id"]
            isOneToOne: false
            referencedRelation: "consortium_quotas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultor_commissions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          cargo: string | null
          company_id: string | null
          created_at: string
          created_by: string
          email: string | null
          id: string
          lead_id: string | null
          nome: string
          observacoes: string | null
          owner_id: string | null
          telefone: string | null
          tenant_id: string
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          cargo?: string | null
          company_id?: string | null
          created_at?: string
          created_by: string
          email?: string | null
          id?: string
          lead_id?: string | null
          nome: string
          observacoes?: string | null
          owner_id?: string | null
          telefone?: string | null
          tenant_id: string
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          cargo?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string
          email?: string | null
          id?: string
          lead_id?: string | null
          nome?: string
          observacoes?: string | null
          owner_id?: string | null
          telefone?: string | null
          tenant_id?: string
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_products: {
        Row: {
          ativo: boolean
          banco: string | null
          comissao_pct: number | null
          created_at: string
          id: string
          nome: string
          observacoes: string | null
          prazo_max: number | null
          prazo_min: number | null
          taxa_max: number | null
          taxa_min: number | null
          tenant_id: string
          tipo: Database["public"]["Enums"]["credit_product_type"]
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          banco?: string | null
          comissao_pct?: number | null
          created_at?: string
          id?: string
          nome: string
          observacoes?: string | null
          prazo_max?: number | null
          prazo_min?: number | null
          taxa_max?: number | null
          taxa_min?: number | null
          tenant_id: string
          tipo: Database["public"]["Enums"]["credit_product_type"]
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          banco?: string | null
          comissao_pct?: number | null
          created_at?: string
          id?: string
          nome?: string
          observacoes?: string | null
          prazo_max?: number | null
          prazo_min?: number | null
          taxa_max?: number | null
          taxa_min?: number | null
          tenant_id?: string
          tipo?: Database["public"]["Enums"]["credit_product_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_products_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_simulations: {
        Row: {
          cet_anual: number | null
          client_id: string | null
          created_at: string
          created_by: string | null
          id: string
          lead_id: string | null
          parcela: number
          payload: Json
          pdf_url: string | null
          prazo_meses: number
          product_id: string | null
          taxa_mensal: number
          tenant_id: string
          total_pago: number
          updated_at: string
          valor_solicitado: number
        }
        Insert: {
          cet_anual?: number | null
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          lead_id?: string | null
          parcela: number
          payload?: Json
          pdf_url?: string | null
          prazo_meses: number
          product_id?: string | null
          taxa_mensal: number
          tenant_id: string
          total_pago: number
          updated_at?: string
          valor_solicitado: number
        }
        Update: {
          cet_anual?: number | null
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          lead_id?: string | null
          parcela?: number
          payload?: Json
          pdf_url?: string | null
          prazo_meses?: number
          product_id?: string | null
          taxa_mensal?: number
          tenant_id?: string
          total_pago?: number
          updated_at?: string
          valor_solicitado?: number
        }
        Relationships: [
          {
            foreignKeyName: "credit_simulations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_simulations_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_simulations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "credit_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_simulations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      deals: {
        Row: {
          created_at: string
          fechado_em: string | null
          id: string
          lead_id: string | null
          motivo_perda: string | null
          owner_id: string | null
          probabilidade: number | null
          stage: Database["public"]["Enums"]["lead_status"]
          tenant_id: string
          titulo: string
          updated_at: string
          valor: number
        }
        Insert: {
          created_at?: string
          fechado_em?: string | null
          id?: string
          lead_id?: string | null
          motivo_perda?: string | null
          owner_id?: string | null
          probabilidade?: number | null
          stage?: Database["public"]["Enums"]["lead_status"]
          tenant_id: string
          titulo: string
          updated_at?: string
          valor?: number
        }
        Update: {
          created_at?: string
          fechado_em?: string | null
          id?: string
          lead_id?: string | null
          motivo_perda?: string | null
          owner_id?: string | null
          probabilidade?: number | null
          stage?: Database["public"]["Enums"]["lead_status"]
          tenant_id?: string
          titulo?: string
          updated_at?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "deals_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      dental_professionals: {
        Row: {
          ativo: boolean
          cor: string | null
          created_at: string
          created_by: string
          cro: string | null
          especialidade: string | null
          id: string
          nome: string
          tenant_id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          ativo?: boolean
          cor?: string | null
          created_at?: string
          created_by: string
          cro?: string | null
          especialidade?: string | null
          id?: string
          nome: string
          tenant_id: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          ativo?: boolean
          cor?: string | null
          created_at?: string
          created_by?: string
          cro?: string | null
          especialidade?: string | null
          id?: string
          nome?: string
          tenant_id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      financial_commissions: {
        Row: {
          base_valor: number
          competencia: string | null
          created_at: string
          created_by: string
          deal_id: string | null
          descricao: string
          entry_id: string | null
          id: string
          observacoes: string | null
          paga_em: string | null
          percentual: number | null
          status: Database["public"]["Enums"]["commission_status"]
          tenant_id: string
          updated_at: string
          user_id: string
          valor: number
        }
        Insert: {
          base_valor?: number
          competencia?: string | null
          created_at?: string
          created_by: string
          deal_id?: string | null
          descricao: string
          entry_id?: string | null
          id?: string
          observacoes?: string | null
          paga_em?: string | null
          percentual?: number | null
          status?: Database["public"]["Enums"]["commission_status"]
          tenant_id: string
          updated_at?: string
          user_id: string
          valor?: number
        }
        Update: {
          base_valor?: number
          competencia?: string | null
          created_at?: string
          created_by?: string
          deal_id?: string | null
          descricao?: string
          entry_id?: string | null
          id?: string
          observacoes?: string | null
          paga_em?: string | null
          percentual?: number | null
          status?: Database["public"]["Enums"]["commission_status"]
          tenant_id?: string
          updated_at?: string
          user_id?: string
          valor?: number
        }
        Relationships: []
      }
      financial_entries: {
        Row: {
          categoria: Database["public"]["Enums"]["financial_entry_category"]
          client_id: string | null
          created_at: string
          created_by: string
          deal_id: string | null
          descricao: string
          forma_pagamento:
            | Database["public"]["Enums"]["financial_payment_method"]
            | null
          id: string
          lead_id: string | null
          observacoes: string | null
          origem: string | null
          project_id: string | null
          recebido_em: string | null
          status: Database["public"]["Enums"]["financial_status"]
          tenant_id: string
          updated_at: string
          valor: number
          valor_pago: number
          vencimento: string | null
        }
        Insert: {
          categoria?: Database["public"]["Enums"]["financial_entry_category"]
          client_id?: string | null
          created_at?: string
          created_by: string
          deal_id?: string | null
          descricao: string
          forma_pagamento?:
            | Database["public"]["Enums"]["financial_payment_method"]
            | null
          id?: string
          lead_id?: string | null
          observacoes?: string | null
          origem?: string | null
          project_id?: string | null
          recebido_em?: string | null
          status?: Database["public"]["Enums"]["financial_status"]
          tenant_id: string
          updated_at?: string
          valor?: number
          valor_pago?: number
          vencimento?: string | null
        }
        Update: {
          categoria?: Database["public"]["Enums"]["financial_entry_category"]
          client_id?: string | null
          created_at?: string
          created_by?: string
          deal_id?: string | null
          descricao?: string
          forma_pagamento?:
            | Database["public"]["Enums"]["financial_payment_method"]
            | null
          id?: string
          lead_id?: string | null
          observacoes?: string | null
          origem?: string | null
          project_id?: string | null
          recebido_em?: string | null
          status?: Database["public"]["Enums"]["financial_status"]
          tenant_id?: string
          updated_at?: string
          valor?: number
          valor_pago?: number
          vencimento?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "financial_entries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_expenses: {
        Row: {
          categoria: Database["public"]["Enums"]["financial_expense_category"]
          created_at: string
          created_by: string
          descricao: string
          forma_pagamento:
            | Database["public"]["Enums"]["financial_payment_method"]
            | null
          fornecedor: string | null
          id: string
          observacoes: string | null
          pago_em: string | null
          recorrente: boolean
          status: Database["public"]["Enums"]["financial_status"]
          tenant_id: string
          updated_at: string
          valor: number
          vencimento: string | null
        }
        Insert: {
          categoria?: Database["public"]["Enums"]["financial_expense_category"]
          created_at?: string
          created_by: string
          descricao: string
          forma_pagamento?:
            | Database["public"]["Enums"]["financial_payment_method"]
            | null
          fornecedor?: string | null
          id?: string
          observacoes?: string | null
          pago_em?: string | null
          recorrente?: boolean
          status?: Database["public"]["Enums"]["financial_status"]
          tenant_id: string
          updated_at?: string
          valor?: number
          vencimento?: string | null
        }
        Update: {
          categoria?: Database["public"]["Enums"]["financial_expense_category"]
          created_at?: string
          created_by?: string
          descricao?: string
          forma_pagamento?:
            | Database["public"]["Enums"]["financial_payment_method"]
            | null
          fornecedor?: string | null
          id?: string
          observacoes?: string | null
          pago_em?: string | null
          recorrente?: boolean
          status?: Database["public"]["Enums"]["financial_status"]
          tenant_id?: string
          updated_at?: string
          valor?: number
          vencimento?: string | null
        }
        Relationships: []
      }
      financial_payments: {
        Row: {
          created_at: string
          created_by: string
          entry_id: string
          forma_pagamento:
            | Database["public"]["Enums"]["financial_payment_method"]
            | null
          id: string
          observacoes: string | null
          pago_em: string
          tenant_id: string
          valor: number
        }
        Insert: {
          created_at?: string
          created_by: string
          entry_id: string
          forma_pagamento?:
            | Database["public"]["Enums"]["financial_payment_method"]
            | null
          id?: string
          observacoes?: string | null
          pago_em?: string
          tenant_id: string
          valor?: number
        }
        Update: {
          created_at?: string
          created_by?: string
          entry_id?: string
          forma_pagamento?:
            | Database["public"]["Enums"]["financial_payment_method"]
            | null
          id?: string
          observacoes?: string | null
          pago_em?: string
          tenant_id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "financial_payments_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "financial_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_subscriptions: {
        Row: {
          cancelado_em: string | null
          client_id: string | null
          created_at: string
          created_by: string
          id: string
          inicio: string
          motivo_cancelamento: string | null
          observacoes: string | null
          plano: string
          proximo_vencimento: string | null
          status: Database["public"]["Enums"]["subscription_status"]
          tenant_id: string
          updated_at: string
          valor_mensal: number
        }
        Insert: {
          cancelado_em?: string | null
          client_id?: string | null
          created_at?: string
          created_by: string
          id?: string
          inicio?: string
          motivo_cancelamento?: string | null
          observacoes?: string | null
          plano: string
          proximo_vencimento?: string | null
          status?: Database["public"]["Enums"]["subscription_status"]
          tenant_id: string
          updated_at?: string
          valor_mensal?: number
        }
        Update: {
          cancelado_em?: string | null
          client_id?: string | null
          created_at?: string
          created_by?: string
          id?: string
          inicio?: string
          motivo_cancelamento?: string | null
          observacoes?: string | null
          plano?: string
          proximo_vencimento?: string | null
          status?: Database["public"]["Enums"]["subscription_status"]
          tenant_id?: string
          updated_at?: string
          valor_mensal?: number
        }
        Relationships: []
      }
      kassia_conversations: {
        Row: {
          created_at: string
          id: string
          tenant_id: string
          titulo: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          tenant_id: string
          titulo?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          tenant_id?: string
          titulo?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      kassia_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          metadata: Json | null
          role: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          metadata?: Json | null
          role: string
          tenant_id: string
          user_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          role?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "kassia_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "kassia_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_articles: {
        Row: {
          categoria: string | null
          conteudo: string | null
          created_at: string
          created_by: string
          id: string
          publico: boolean | null
          slug: string
          tenant_id: string
          titulo: string
          updated_at: string
          visualizacoes: number | null
        }
        Insert: {
          categoria?: string | null
          conteudo?: string | null
          created_at?: string
          created_by: string
          id?: string
          publico?: boolean | null
          slug: string
          tenant_id: string
          titulo: string
          updated_at?: string
          visualizacoes?: number | null
        }
        Update: {
          categoria?: string | null
          conteudo?: string | null
          created_at?: string
          created_by?: string
          id?: string
          publico?: boolean | null
          slug?: string
          tenant_id?: string
          titulo?: string
          updated_at?: string
          visualizacoes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_articles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      landing_pages: {
        Row: {
          config: Json | null
          conversoes: number | null
          created_at: string
          created_by: string
          id: string
          slug: string
          status: string
          tenant_id: string
          titulo: string
          updated_at: string
          visitas: number | null
        }
        Insert: {
          config?: Json | null
          conversoes?: number | null
          created_at?: string
          created_by: string
          id?: string
          slug: string
          status?: string
          tenant_id: string
          titulo: string
          updated_at?: string
          visitas?: number | null
        }
        Update: {
          config?: Json | null
          conversoes?: number | null
          created_at?: string
          created_by?: string
          id?: string
          slug?: string
          status?: string
          tenant_id?: string
          titulo?: string
          updated_at?: string
          visitas?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "landing_pages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          ai_resumo: string | null
          ai_score: number | null
          ai_sugestao: string | null
          created_at: string
          created_by: string
          email: string | null
          empresa: string | null
          id: string
          interesse: string | null
          nome: string
          observacoes: string | null
          origem: string | null
          owner_id: string | null
          status: Database["public"]["Enums"]["lead_status"]
          tags: string[] | null
          tenant_id: string
          ultimo_contato_em: string | null
          updated_at: string
          valor_estimado: number | null
          whatsapp: string | null
        }
        Insert: {
          ai_resumo?: string | null
          ai_score?: number | null
          ai_sugestao?: string | null
          created_at?: string
          created_by: string
          email?: string | null
          empresa?: string | null
          id?: string
          interesse?: string | null
          nome: string
          observacoes?: string | null
          origem?: string | null
          owner_id?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          tags?: string[] | null
          tenant_id: string
          ultimo_contato_em?: string | null
          updated_at?: string
          valor_estimado?: number | null
          whatsapp?: string | null
        }
        Update: {
          ai_resumo?: string | null
          ai_score?: number | null
          ai_sugestao?: string | null
          created_at?: string
          created_by?: string
          email?: string | null
          empresa?: string | null
          id?: string
          interesse?: string | null
          nome?: string
          observacoes?: string | null
          origem?: string | null
          owner_id?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          tags?: string[] | null
          tenant_id?: string
          ultimo_contato_em?: string | null
          updated_at?: string
          valor_estimado?: number | null
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_campaigns: {
        Row: {
          created_at: string
          created_by: string
          fim: string | null
          id: string
          inicio: string | null
          metadata: Json | null
          nome: string
          orcamento: number | null
          status: string
          tenant_id: string
          tipo: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          fim?: string | null
          id?: string
          inicio?: string | null
          metadata?: Json | null
          nome: string
          orcamento?: number | null
          status?: string
          tenant_id: string
          tipo: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          fim?: string | null
          id?: string
          inicio?: string | null
          metadata?: Json | null
          nome?: string
          orcamento?: number | null
          status?: string
          tenant_id?: string
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_campaigns_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_emails: {
        Row: {
          agendado_para: string | null
          assunto: string
          campaign_id: string | null
          corpo_html: string | null
          created_at: string
          created_by: string
          enviado_em: string | null
          id: string
          status: string
          tenant_id: string
          total_abertos: number | null
          total_cliques: number | null
          total_enviados: number | null
        }
        Insert: {
          agendado_para?: string | null
          assunto: string
          campaign_id?: string | null
          corpo_html?: string | null
          created_at?: string
          created_by: string
          enviado_em?: string | null
          id?: string
          status?: string
          tenant_id: string
          total_abertos?: number | null
          total_cliques?: number | null
          total_enviados?: number | null
        }
        Update: {
          agendado_para?: string | null
          assunto?: string
          campaign_id?: string | null
          corpo_html?: string | null
          created_at?: string
          created_by?: string
          enviado_em?: string | null
          id?: string
          status?: string
          tenant_id?: string
          total_abertos?: number | null
          total_cliques?: number | null
          total_enviados?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "marketing_emails_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "marketing_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_emails_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          descricao: string | null
          id: string
          lida: boolean
          lida_em: string | null
          link: string | null
          metadata: Json | null
          prioridade: Database["public"]["Enums"]["task_priority"]
          tenant_id: string
          tipo: Database["public"]["Enums"]["notification_type"]
          titulo: string
          user_id: string
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          id?: string
          lida?: boolean
          lida_em?: string | null
          link?: string | null
          metadata?: Json | null
          prioridade?: Database["public"]["Enums"]["task_priority"]
          tenant_id: string
          tipo: Database["public"]["Enums"]["notification_type"]
          titulo: string
          user_id: string
        }
        Update: {
          created_at?: string
          descricao?: string | null
          id?: string
          lida?: boolean
          lida_em?: string | null
          link?: string | null
          metadata?: Json | null
          prioridade?: Database["public"]["Enums"]["task_priority"]
          tenant_id?: string
          tipo?: Database["public"]["Enums"]["notification_type"]
          titulo?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      patients: {
        Row: {
          alergias: string | null
          cep: string | null
          cidade: string | null
          client_id: string | null
          convenio: string | null
          cpf: string | null
          created_at: string
          created_by: string
          data_nascimento: string | null
          doencas_preexistentes: string | null
          email: string | null
          endereco: string | null
          estado: string | null
          estado_civil: string | null
          genero: string | null
          id: string
          lead_id: string | null
          medicamentos_uso: string | null
          nome: string
          numero_convenio: string | null
          observacoes: string | null
          origem: string | null
          primeiro_atendimento_em: string | null
          profissao: string | null
          responsavel_cpf: string | null
          responsavel_nome: string | null
          rg: string | null
          status: Database["public"]["Enums"]["patient_status"]
          tags: string[] | null
          telefone: string | null
          tenant_id: string
          ultimo_atendimento_em: string | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          alergias?: string | null
          cep?: string | null
          cidade?: string | null
          client_id?: string | null
          convenio?: string | null
          cpf?: string | null
          created_at?: string
          created_by: string
          data_nascimento?: string | null
          doencas_preexistentes?: string | null
          email?: string | null
          endereco?: string | null
          estado?: string | null
          estado_civil?: string | null
          genero?: string | null
          id?: string
          lead_id?: string | null
          medicamentos_uso?: string | null
          nome: string
          numero_convenio?: string | null
          observacoes?: string | null
          origem?: string | null
          primeiro_atendimento_em?: string | null
          profissao?: string | null
          responsavel_cpf?: string | null
          responsavel_nome?: string | null
          rg?: string | null
          status?: Database["public"]["Enums"]["patient_status"]
          tags?: string[] | null
          telefone?: string | null
          tenant_id: string
          ultimo_atendimento_em?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          alergias?: string | null
          cep?: string | null
          cidade?: string | null
          client_id?: string | null
          convenio?: string | null
          cpf?: string | null
          created_at?: string
          created_by?: string
          data_nascimento?: string | null
          doencas_preexistentes?: string | null
          email?: string | null
          endereco?: string | null
          estado?: string | null
          estado_civil?: string | null
          genero?: string | null
          id?: string
          lead_id?: string | null
          medicamentos_uso?: string | null
          nome?: string
          numero_convenio?: string | null
          observacoes?: string | null
          origem?: string | null
          primeiro_atendimento_em?: string | null
          profissao?: string | null
          responsavel_cpf?: string | null
          responsavel_nome?: string | null
          rg?: string | null
          status?: Database["public"]["Enums"]["patient_status"]
          tags?: string[] | null
          telefone?: string | null
          tenant_id?: string
          ultimo_atendimento_em?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      plans: {
        Row: {
          ativo: boolean
          created_at: string
          features: Json
          id: string
          max_leads: number | null
          max_usuarios: number | null
          nome: string
          ordem: number
          preco_mensal: number
          slug: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          features?: Json
          id?: string
          max_leads?: number | null
          max_usuarios?: number | null
          nome: string
          ordem?: number
          preco_mensal?: number
          slug: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          features?: Json
          id?: string
          max_leads?: number | null
          max_usuarios?: number | null
          nome?: string
          ordem?: number
          preco_mensal?: number
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          cargo: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          cargo?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          cargo?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      project_audit_logs: {
        Row: {
          action: string
          affected_entries: Json
          affected_leads: Json
          affected_tasks: Json
          created_at: string
          details: Json
          from_status: string | null
          id: string
          project_id: string
          tenant_id: string
          to_status: string | null
          user_id: string
        }
        Insert: {
          action: string
          affected_entries?: Json
          affected_leads?: Json
          affected_tasks?: Json
          created_at?: string
          details?: Json
          from_status?: string | null
          id?: string
          project_id: string
          tenant_id: string
          to_status?: string | null
          user_id: string
        }
        Update: {
          action?: string
          affected_entries?: Json
          affected_leads?: Json
          affected_tasks?: Json
          created_at?: string
          details?: Json
          from_status?: string | null
          id?: string
          project_id?: string
          tenant_id?: string
          to_status?: string | null
          user_id?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          client_id: string | null
          concluido_em: string | null
          created_at: string
          created_by: string
          descricao: string | null
          entregas: Json
          etapas: Json
          id: string
          inicio: string | null
          lead_id: string | null
          observacoes: string | null
          owner_id: string | null
          prazo: string | null
          prioridade: Database["public"]["Enums"]["task_priority"]
          progresso: number
          status: Database["public"]["Enums"]["project_status"]
          tags: string[] | null
          tenant_id: string
          titulo: string
          updated_at: string
          valor_total: number
        }
        Insert: {
          client_id?: string | null
          concluido_em?: string | null
          created_at?: string
          created_by: string
          descricao?: string | null
          entregas?: Json
          etapas?: Json
          id?: string
          inicio?: string | null
          lead_id?: string | null
          observacoes?: string | null
          owner_id?: string | null
          prazo?: string | null
          prioridade?: Database["public"]["Enums"]["task_priority"]
          progresso?: number
          status?: Database["public"]["Enums"]["project_status"]
          tags?: string[] | null
          tenant_id: string
          titulo: string
          updated_at?: string
          valor_total?: number
        }
        Update: {
          client_id?: string | null
          concluido_em?: string | null
          created_at?: string
          created_by?: string
          descricao?: string | null
          entregas?: Json
          etapas?: Json
          id?: string
          inicio?: string | null
          lead_id?: string | null
          observacoes?: string | null
          owner_id?: string | null
          prazo?: string | null
          prioridade?: Database["public"]["Enums"]["task_priority"]
          progresso?: number
          status?: Database["public"]["Enums"]["project_status"]
          tags?: string[] | null
          tenant_id?: string
          titulo?: string
          updated_at?: string
          valor_total?: number
        }
        Relationships: []
      }
      proposals: {
        Row: {
          aceita_em: string | null
          client_id: string | null
          conteudo: Json | null
          created_at: string
          created_by: string
          id: string
          lead_id: string | null
          status: string
          tenant_id: string
          titulo: string
          token_aceite: string | null
          updated_at: string
          url_pdf: string | null
          validade: string | null
          valor: number | null
          visualizada_em: string | null
        }
        Insert: {
          aceita_em?: string | null
          client_id?: string | null
          conteudo?: Json | null
          created_at?: string
          created_by: string
          id?: string
          lead_id?: string | null
          status?: string
          tenant_id: string
          titulo: string
          token_aceite?: string | null
          updated_at?: string
          url_pdf?: string | null
          validade?: string | null
          valor?: number | null
          visualizada_em?: string | null
        }
        Update: {
          aceita_em?: string | null
          client_id?: string | null
          conteudo?: Json | null
          created_at?: string
          created_by?: string
          id?: string
          lead_id?: string | null
          status?: string
          tenant_id?: string
          titulo?: string
          token_aceite?: string | null
          updated_at?: string
          url_pdf?: string | null
          validade?: string | null
          valor?: number | null
          visualizada_em?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proposals_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      school_announcements: {
        Row: {
          class_id: string | null
          created_at: string
          created_by: string
          id: string
          mensagem: string
          student_id: string | null
          tenant_id: string
          tipo: string | null
          titulo: string
        }
        Insert: {
          class_id?: string | null
          created_at?: string
          created_by: string
          id?: string
          mensagem: string
          student_id?: string | null
          tenant_id: string
          tipo?: string | null
          titulo: string
        }
        Update: {
          class_id?: string | null
          created_at?: string
          created_by?: string
          id?: string
          mensagem?: string
          student_id?: string | null
          tenant_id?: string
          tipo?: string | null
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_announcements_class_fk"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "school_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_announcements_student_fk"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "school_students"
            referencedColumns: ["id"]
          },
        ]
      }
      school_assessments: {
        Row: {
          class_id: string
          created_at: string
          created_by: string
          data: string | null
          descricao: string | null
          id: string
          nota_maxima: number
          peso: number
          tenant_id: string
          tipo: Database["public"]["Enums"]["school_assessment_type"]
          titulo: string
          updated_at: string
        }
        Insert: {
          class_id: string
          created_at?: string
          created_by: string
          data?: string | null
          descricao?: string | null
          id?: string
          nota_maxima?: number
          peso?: number
          tenant_id: string
          tipo?: Database["public"]["Enums"]["school_assessment_type"]
          titulo: string
          updated_at?: string
        }
        Update: {
          class_id?: string
          created_at?: string
          created_by?: string
          data?: string | null
          descricao?: string | null
          id?: string
          nota_maxima?: number
          peso?: number
          tenant_id?: string
          tipo?: Database["public"]["Enums"]["school_assessment_type"]
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_assessments_class_fk"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "school_classes"
            referencedColumns: ["id"]
          },
        ]
      }
      school_attendance: {
        Row: {
          created_at: string
          created_by: string
          id: string
          lesson_id: string
          observacao: string | null
          status: Database["public"]["Enums"]["school_attendance_status"]
          student_id: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          lesson_id: string
          observacao?: string | null
          status?: Database["public"]["Enums"]["school_attendance_status"]
          student_id: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          lesson_id?: string
          observacao?: string | null
          status?: Database["public"]["Enums"]["school_attendance_status"]
          student_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_attendance_lesson_fk"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "school_lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_attendance_student_fk"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "school_students"
            referencedColumns: ["id"]
          },
        ]
      }
      school_classes: {
        Row: {
          ano: number | null
          course_id: string
          created_at: string
          created_by: string
          horario: string | null
          id: string
          nome: string
          periodo: string | null
          sala: string | null
          status: Database["public"]["Enums"]["school_course_status"]
          teacher_id: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          ano?: number | null
          course_id: string
          created_at?: string
          created_by: string
          horario?: string | null
          id?: string
          nome: string
          periodo?: string | null
          sala?: string | null
          status?: Database["public"]["Enums"]["school_course_status"]
          teacher_id?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          ano?: number | null
          course_id?: string
          created_at?: string
          created_by?: string
          horario?: string | null
          id?: string
          nome?: string
          periodo?: string | null
          sala?: string | null
          status?: Database["public"]["Enums"]["school_course_status"]
          teacher_id?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_classes_course_fk"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "school_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_classes_teacher_fk"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "school_teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      school_courses: {
        Row: {
          carga_horaria: number | null
          cor: string | null
          created_at: string
          created_by: string
          descricao: string | null
          id: string
          nome: string
          status: Database["public"]["Enums"]["school_course_status"]
          tenant_id: string
          updated_at: string
        }
        Insert: {
          carga_horaria?: number | null
          cor?: string | null
          created_at?: string
          created_by: string
          descricao?: string | null
          id?: string
          nome: string
          status?: Database["public"]["Enums"]["school_course_status"]
          tenant_id: string
          updated_at?: string
        }
        Update: {
          carga_horaria?: number | null
          cor?: string | null
          created_at?: string
          created_by?: string
          descricao?: string | null
          id?: string
          nome?: string
          status?: Database["public"]["Enums"]["school_course_status"]
          tenant_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      school_enrollments: {
        Row: {
          class_id: string
          created_at: string
          fim: string | null
          id: string
          inicio: string
          status: string
          student_id: string
          tenant_id: string
        }
        Insert: {
          class_id: string
          created_at?: string
          fim?: string | null
          id?: string
          inicio?: string
          status?: string
          student_id: string
          tenant_id: string
        }
        Update: {
          class_id?: string
          created_at?: string
          fim?: string | null
          id?: string
          inicio?: string
          status?: string
          student_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_enrollments_class_fk"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "school_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_enrollments_student_fk"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "school_students"
            referencedColumns: ["id"]
          },
        ]
      }
      school_grades: {
        Row: {
          assessment_id: string
          comentario: string | null
          created_at: string
          created_by: string
          id: string
          nota: number | null
          student_id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          assessment_id: string
          comentario?: string | null
          created_at?: string
          created_by: string
          id?: string
          nota?: number | null
          student_id: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          assessment_id?: string
          comentario?: string | null
          created_at?: string
          created_by?: string
          id?: string
          nota?: number | null
          student_id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_grades_assessment_fk"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "school_assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_grades_student_fk"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "school_students"
            referencedColumns: ["id"]
          },
        ]
      }
      school_lessons: {
        Row: {
          class_id: string
          conteudo: string | null
          created_at: string
          created_by: string
          data: string
          id: string
          observacoes: string | null
          teacher_id: string | null
          tenant_id: string
          titulo: string
          updated_at: string
        }
        Insert: {
          class_id: string
          conteudo?: string | null
          created_at?: string
          created_by: string
          data?: string
          id?: string
          observacoes?: string | null
          teacher_id?: string | null
          tenant_id: string
          titulo: string
          updated_at?: string
        }
        Update: {
          class_id?: string
          conteudo?: string | null
          created_at?: string
          created_by?: string
          data?: string
          id?: string
          observacoes?: string | null
          teacher_id?: string | null
          tenant_id?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_lessons_class_fk"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "school_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_lessons_teacher_fk"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "school_teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      school_students: {
        Row: {
          client_id: string | null
          cpf: string | null
          created_at: string
          created_by: string
          data_nascimento: string | null
          email: string | null
          endereco: string | null
          id: string
          matricula: string | null
          nome: string
          observacoes: string | null
          responsavel_email: string | null
          responsavel_nome: string | null
          responsavel_telefone: string | null
          status: string
          telefone: string | null
          tenant_id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          client_id?: string | null
          cpf?: string | null
          created_at?: string
          created_by: string
          data_nascimento?: string | null
          email?: string | null
          endereco?: string | null
          id?: string
          matricula?: string | null
          nome: string
          observacoes?: string | null
          responsavel_email?: string | null
          responsavel_nome?: string | null
          responsavel_telefone?: string | null
          status?: string
          telefone?: string | null
          tenant_id: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          client_id?: string | null
          cpf?: string | null
          created_at?: string
          created_by?: string
          data_nascimento?: string | null
          email?: string | null
          endereco?: string | null
          id?: string
          matricula?: string | null
          nome?: string
          observacoes?: string | null
          responsavel_email?: string | null
          responsavel_nome?: string | null
          responsavel_telefone?: string | null
          status?: string
          telefone?: string | null
          tenant_id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      school_teachers: {
        Row: {
          ativo: boolean
          bio: string | null
          created_at: string
          created_by: string
          disciplinas: string[] | null
          email: string | null
          id: string
          nome: string
          telefone: string | null
          tenant_id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          ativo?: boolean
          bio?: string | null
          created_at?: string
          created_by: string
          disciplinas?: string[] | null
          email?: string | null
          id?: string
          nome: string
          telefone?: string | null
          tenant_id: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          ativo?: boolean
          bio?: string | null
          created_at?: string
          created_by?: string
          disciplinas?: string[] | null
          email?: string | null
          id?: string
          nome?: string
          telefone?: string | null
          tenant_id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          cancelada_em: string | null
          created_at: string
          id: string
          iniciada_em: string
          metadata: Json
          motivo_cancelamento: string | null
          plan_id: string
          proximo_vencimento: string | null
          status: Database["public"]["Enums"]["tenant_status"]
          tenant_id: string
          updated_at: string
          valor: number
        }
        Insert: {
          cancelada_em?: string | null
          created_at?: string
          id?: string
          iniciada_em?: string
          metadata?: Json
          motivo_cancelamento?: string | null
          plan_id: string
          proximo_vencimento?: string | null
          status?: Database["public"]["Enums"]["tenant_status"]
          tenant_id: string
          updated_at?: string
          valor?: number
        }
        Update: {
          cancelada_em?: string | null
          created_at?: string
          id?: string
          iniciada_em?: string
          metadata?: Json
          motivo_cancelamento?: string | null
          plan_id?: string
          proximo_vencimento?: string | null
          status?: Database["public"]["Enums"]["tenant_status"]
          tenant_id?: string
          updated_at?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          assignee_id: string | null
          assunto: string
          categoria: string | null
          client_id: string | null
          created_at: string
          created_by: string
          descricao: string | null
          id: string
          prioridade: string
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          assignee_id?: string | null
          assunto: string
          categoria?: string | null
          client_id?: string | null
          created_at?: string
          created_by: string
          descricao?: string | null
          id?: string
          prioridade?: string
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          assignee_id?: string | null
          assunto?: string
          categoria?: string | null
          client_id?: string | null
          created_at?: string
          created_by?: string
          descricao?: string | null
          id?: string
          prioridade?: string
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assignee_id: string | null
          client_id: string | null
          concluida_em: string | null
          created_at: string
          created_by: string
          descricao: string | null
          id: string
          lead_id: string | null
          prazo: string | null
          prioridade: Database["public"]["Enums"]["task_priority"]
          project_id: string | null
          status: Database["public"]["Enums"]["task_status"]
          tenant_id: string
          titulo: string
          updated_at: string
        }
        Insert: {
          assignee_id?: string | null
          client_id?: string | null
          concluida_em?: string | null
          created_at?: string
          created_by: string
          descricao?: string | null
          id?: string
          lead_id?: string | null
          prazo?: string | null
          prioridade?: Database["public"]["Enums"]["task_priority"]
          project_id?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          tenant_id: string
          titulo: string
          updated_at?: string
        }
        Update: {
          assignee_id?: string | null
          client_id?: string | null
          concluida_em?: string | null
          created_at?: string
          created_by?: string
          descricao?: string | null
          id?: string
          lead_id?: string | null
          prazo?: string | null
          prioridade?: Database["public"]["Enums"]["task_priority"]
          project_id?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          tenant_id?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_users: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["tenant_role"]
          tenant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["tenant_role"]
          tenant_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["tenant_role"]
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_users_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          created_at: string
          created_by: string | null
          email_principal: string | null
          id: string
          logo_url: string | null
          nome: string
          observacoes: string | null
          plan_id: string | null
          proximo_vencimento: string | null
          responsavel: string | null
          segmento: Database["public"]["Enums"]["tenant_segmento"]
          slug: string
          status: Database["public"]["Enums"]["tenant_status"]
          trial_ate: string | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          email_principal?: string | null
          id?: string
          logo_url?: string | null
          nome: string
          observacoes?: string | null
          plan_id?: string | null
          proximo_vencimento?: string | null
          responsavel?: string | null
          segmento?: Database["public"]["Enums"]["tenant_segmento"]
          slug: string
          status?: Database["public"]["Enums"]["tenant_status"]
          trial_ate?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          email_principal?: string | null
          id?: string
          logo_url?: string | null
          nome?: string
          observacoes?: string | null
          plan_id?: string | null
          proximo_vencimento?: string | null
          responsavel?: string | null
          segmento?: Database["public"]["Enums"]["tenant_segmento"]
          slug?: string
          status?: Database["public"]["Enums"]["tenant_status"]
          trial_ate?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenants_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_messages: {
        Row: {
          autor_id: string
          autor_tipo: string
          conteudo: string
          created_at: string
          id: string
          interno: boolean
          tenant_id: string
          ticket_id: string
        }
        Insert: {
          autor_id: string
          autor_tipo?: string
          conteudo: string
          created_at?: string
          id?: string
          interno?: boolean
          tenant_id: string
          ticket_id: string
        }
        Update: {
          autor_id?: string
          autor_tipo?: string
          conteudo?: string
          created_at?: string
          id?: string
          interno?: boolean
          tenant_id?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          assignee_id: string | null
          assunto: string
          client_id: string | null
          company_id: string | null
          contact_id: string | null
          created_at: string
          created_by: string
          descricao: string | null
          fechado_em: string | null
          id: string
          numero: number
          prioridade: Database["public"]["Enums"]["ticket_priority"]
          resolvido_em: string | null
          sla_vencimento: string | null
          status: Database["public"]["Enums"]["ticket_status"]
          tags: string[] | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          assignee_id?: string | null
          assunto: string
          client_id?: string | null
          company_id?: string | null
          contact_id?: string | null
          created_at?: string
          created_by: string
          descricao?: string | null
          fechado_em?: string | null
          id?: string
          numero?: number
          prioridade?: Database["public"]["Enums"]["ticket_priority"]
          resolvido_em?: string | null
          sla_vencimento?: string | null
          status?: Database["public"]["Enums"]["ticket_status"]
          tags?: string[] | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          assignee_id?: string | null
          assunto?: string
          client_id?: string | null
          company_id?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: string
          descricao?: string | null
          fechado_em?: string | null
          id?: string
          numero?: number
          prioridade?: Database["public"]["Enums"]["ticket_priority"]
          resolvido_em?: string | null
          sla_vencimento?: string | null
          status?: Database["public"]["Enums"]["ticket_status"]
          tags?: string[] | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tickets_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      user_commercial_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["commercial_role"]
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["commercial_role"]
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["commercial_role"]
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_delete_commercial: {
        Args: { _tenant_id: string; _user_id: string }
        Returns: boolean
      }
      can_edit_commercial: {
        Args: { _tenant_id: string; _user_id: string }
        Returns: boolean
      }
      create_tenant_with_owner: {
        Args: {
          _email_principal?: string
          _nome: string
          _responsavel?: string
          _slug: string
        }
        Returns: {
          created_at: string
          created_by: string | null
          email_principal: string | null
          id: string
          logo_url: string | null
          nome: string
          observacoes: string | null
          plan_id: string | null
          proximo_vencimento: string | null
          responsavel: string | null
          segmento: Database["public"]["Enums"]["tenant_segmento"]
          slug: string
          status: Database["public"]["Enums"]["tenant_status"]
          trial_ate: string | null
          updated_at: string
          whatsapp: string | null
        }
        SetofOptions: {
          from: "*"
          to: "tenants"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      execute_automations: {
        Args: {
          _lead: Database["public"]["Tables"]["leads"]["Row"]
          _trigger: Database["public"]["Enums"]["automation_trigger"]
        }
        Returns: undefined
      }
      has_commercial_role: {
        Args: {
          _role: Database["public"]["Enums"]["commercial_role"]
          _tenant_id: string
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_school_student: {
        Args: { _student_id: string; _user_id: string }
        Returns: boolean
      }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
      is_tenant_admin: {
        Args: { _tenant_id: string; _user_id: string }
        Returns: boolean
      }
      is_tenant_member: {
        Args: { _tenant_id: string; _user_id: string }
        Returns: boolean
      }
      mark_overdue_financial: { Args: never; Returns: undefined }
      notify_tenant: {
        Args: {
          _descricao?: string
          _link?: string
          _metadata?: Json
          _prioridade?: Database["public"]["Enums"]["task_priority"]
          _tenant_id: string
          _tipo: Database["public"]["Enums"]["notification_type"]
          _titulo: string
        }
        Returns: undefined
      }
      user_tenant_ids: { Args: { _user_id: string }; Returns: string[] }
    }
    Enums: {
      activity_type:
        | "ligacao"
        | "email"
        | "whatsapp"
        | "reuniao"
        | "nota"
        | "movimentacao"
        | "tarefa"
      app_role: "super_admin" | "tenant_admin" | "tenant_user"
      appointment_status:
        | "agendado"
        | "confirmado"
        | "em_atendimento"
        | "realizado"
        | "faltou"
        | "cancelado"
        | "remarcado"
      automation_trigger:
        | "lead_criado"
        | "status_mudou"
        | "score_alto"
        | "score_baixou"
      clinical_record_type:
        | "anamnese"
        | "evolucao"
        | "observacao"
        | "retorno"
        | "procedimento"
      commercial_role: "admin" | "comercial" | "visualizador"
      commission_status: "pendente" | "aprovada" | "paga" | "cancelada"
      consortium_segment: "imovel" | "veiculo" | "servicos" | "pesado" | "moto"
      contemplation_type:
        | "sorteio"
        | "lance_livre"
        | "lance_fixo"
        | "lance_embutido"
      credit_product_type:
        | "consignado"
        | "fgts"
        | "home_equity"
        | "refin_veicular"
        | "pessoal"
        | "antecipacao_ir"
      financial_entry_category:
        | "venda"
        | "assinatura"
        | "servico"
        | "consultoria"
        | "outros"
      financial_expense_category:
        | "salario"
        | "ferramenta"
        | "marketing"
        | "operacao"
        | "imposto"
        | "fornecedor"
        | "comissao"
        | "outros"
      financial_payment_method:
        | "pix"
        | "boleto"
        | "cartao_credito"
        | "cartao_debito"
        | "transferencia"
        | "dinheiro"
        | "outros"
      financial_status: "pendente" | "pago" | "atrasado" | "cancelado"
      lead_status:
        | "novo"
        | "contato_inicial"
        | "qualificacao"
        | "proposta"
        | "negociacao"
        | "fechado"
        | "perdido"
      notification_type:
        | "lead_novo"
        | "lead_quente"
        | "lead_frio"
        | "status_mudou"
        | "tarefa_criada"
        | "tarefa_atrasada"
        | "tarefa_concluida"
        | "financeiro_vencendo"
        | "financeiro_atrasado"
        | "financeiro_recebido"
        | "cliente_novo"
        | "automacao_executada"
        | "insight_ia"
        | "sistema"
      patient_status: "ativo" | "inativo" | "bloqueado"
      project_status:
        | "planejado"
        | "em_andamento"
        | "pausado"
        | "concluido"
        | "cancelado"
      quota_status:
        | "ativa"
        | "contemplada"
        | "quitada"
        | "cancelada"
        | "transferida"
        | "atrasada"
      school_assessment_type:
        | "prova"
        | "trabalho"
        | "atividade"
        | "participacao"
        | "outro"
      school_attendance_status:
        | "presente"
        | "falta"
        | "justificada"
        | "atrasado"
      school_course_status: "ativo" | "inativo" | "arquivado"
      subscription_status:
        | "trial"
        | "ativo"
        | "suspenso"
        | "cancelado"
        | "inadimplente"
      task_priority: "baixa" | "media" | "alta" | "urgente"
      task_status: "pendente" | "em_andamento" | "concluida" | "cancelada"
      tenant_role: "tenant_admin" | "tenant_user"
      tenant_segmento: "geral" | "clinica" | "escolar"
      tenant_status: "trial" | "ativo" | "suspenso" | "cancelado"
      ticket_priority: "baixa" | "media" | "alta" | "urgente"
      ticket_status:
        | "aberto"
        | "em_andamento"
        | "aguardando"
        | "resolvido"
        | "fechado"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      activity_type: [
        "ligacao",
        "email",
        "whatsapp",
        "reuniao",
        "nota",
        "movimentacao",
        "tarefa",
      ],
      app_role: ["super_admin", "tenant_admin", "tenant_user"],
      appointment_status: [
        "agendado",
        "confirmado",
        "em_atendimento",
        "realizado",
        "faltou",
        "cancelado",
        "remarcado",
      ],
      automation_trigger: [
        "lead_criado",
        "status_mudou",
        "score_alto",
        "score_baixou",
      ],
      clinical_record_type: [
        "anamnese",
        "evolucao",
        "observacao",
        "retorno",
        "procedimento",
      ],
      commercial_role: ["admin", "comercial", "visualizador"],
      commission_status: ["pendente", "aprovada", "paga", "cancelada"],
      consortium_segment: ["imovel", "veiculo", "servicos", "pesado", "moto"],
      contemplation_type: [
        "sorteio",
        "lance_livre",
        "lance_fixo",
        "lance_embutido",
      ],
      credit_product_type: [
        "consignado",
        "fgts",
        "home_equity",
        "refin_veicular",
        "pessoal",
        "antecipacao_ir",
      ],
      financial_entry_category: [
        "venda",
        "assinatura",
        "servico",
        "consultoria",
        "outros",
      ],
      financial_expense_category: [
        "salario",
        "ferramenta",
        "marketing",
        "operacao",
        "imposto",
        "fornecedor",
        "comissao",
        "outros",
      ],
      financial_payment_method: [
        "pix",
        "boleto",
        "cartao_credito",
        "cartao_debito",
        "transferencia",
        "dinheiro",
        "outros",
      ],
      financial_status: ["pendente", "pago", "atrasado", "cancelado"],
      lead_status: [
        "novo",
        "contato_inicial",
        "qualificacao",
        "proposta",
        "negociacao",
        "fechado",
        "perdido",
      ],
      notification_type: [
        "lead_novo",
        "lead_quente",
        "lead_frio",
        "status_mudou",
        "tarefa_criada",
        "tarefa_atrasada",
        "tarefa_concluida",
        "financeiro_vencendo",
        "financeiro_atrasado",
        "financeiro_recebido",
        "cliente_novo",
        "automacao_executada",
        "insight_ia",
        "sistema",
      ],
      patient_status: ["ativo", "inativo", "bloqueado"],
      project_status: [
        "planejado",
        "em_andamento",
        "pausado",
        "concluido",
        "cancelado",
      ],
      quota_status: [
        "ativa",
        "contemplada",
        "quitada",
        "cancelada",
        "transferida",
        "atrasada",
      ],
      school_assessment_type: [
        "prova",
        "trabalho",
        "atividade",
        "participacao",
        "outro",
      ],
      school_attendance_status: [
        "presente",
        "falta",
        "justificada",
        "atrasado",
      ],
      school_course_status: ["ativo", "inativo", "arquivado"],
      subscription_status: [
        "trial",
        "ativo",
        "suspenso",
        "cancelado",
        "inadimplente",
      ],
      task_priority: ["baixa", "media", "alta", "urgente"],
      task_status: ["pendente", "em_andamento", "concluida", "cancelada"],
      tenant_role: ["tenant_admin", "tenant_user"],
      tenant_segmento: ["geral", "clinica", "escolar"],
      tenant_status: ["trial", "ativo", "suspenso", "cancelado"],
      ticket_priority: ["baixa", "media", "alta", "urgente"],
      ticket_status: [
        "aberto",
        "em_andamento",
        "aguardando",
        "resolvido",
        "fechado",
      ],
    },
  },
} as const
