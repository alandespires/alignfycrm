import type { ProspectingFilters, ProspectingProvider, RawLead } from "../types.ts";

type GooglePlace = {
  id?: string;
  displayName?: { text?: string };
  primaryTypeDisplayName?: { text?: string };
  formattedAddress?: string;
  nationalPhoneNumber?: string;
  internationalPhoneNumber?: string;
  websiteUri?: string;
  googleMapsUri?: string;
  rating?: number;
  userRatingCount?: number;
  businessStatus?: string;
  regularOpeningHours?: { weekdayDescriptions?: string[] };
  openingDate?: { year?: number; month?: number; day?: number };
};

export class GooglePlacesProvider implements ProspectingProvider {
  readonly name = "google_places";
  readonly isDemo = false;

  constructor(private readonly apiKey: string) {}

  private async request(body: Record<string, unknown>) {
    let lastStatus = 0;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": this.apiKey,
            "X-Goog-FieldMask": [
              "places.id",
              "places.displayName",
              "places.primaryTypeDisplayName",
              "places.formattedAddress",
              "places.nationalPhoneNumber",
              "places.internationalPhoneNumber",
              "places.websiteUri",
              "places.googleMapsUri",
              "places.rating",
              "places.userRatingCount",
              "places.businessStatus",
              "places.regularOpeningHours",
              "places.openingDate",
              "nextPageToken",
            ].join(","),
          },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(15_000),
        });
        if (response.ok) return response.json();

        lastStatus = response.status;
        const detail = await response.text();
        if (response.status !== 429 && response.status < 500) {
          throw new Error(`google_places_${response.status}:${detail.slice(0, 300)}`);
        }
        if (attempt === 2) {
          throw new Error(`google_places_${response.status}:${detail.slice(0, 300)}`);
        }
      } catch (error) {
        if (error instanceof Error && error.message.startsWith("google_places_")) throw error;
        if (attempt === 2) {
          throw new Error(`google_places_timeout:${lastStatus || "network"}`);
        }
      }
      await new Promise((resolve) => setTimeout(resolve, 300 * 2 ** attempt));
    }
    throw new Error("google_places_unavailable");
  }

  async search(filters: ProspectingFilters): Promise<RawLead[]> {
    const desired = Math.min(60, Math.max(1, filters.quantidade ?? 20));
    const requiresPostFiltering = Boolean(
      filters.sem_site ||
      filters.possui_site ||
      filters.sem_whatsapp ||
      filters.possui_whatsapp ||
      filters.possui_email ||
      filters.reviews_min ||
      filters.baixa_presenca_digital,
    );
    const candidateTarget = requiresPostFiltering ? 60 : desired;
    const location = [filters.cidade, filters.uf].filter(Boolean).join(" - ");
    const query = [filters.palavra_chave || filters.nicho, location].filter(Boolean).join(" em ");
    const places: GooglePlace[] = [];
    let pageToken: string | undefined;

    do {
      const data = await this.request({
        textQuery: query,
        languageCode: "pt-BR",
        pageSize: Math.min(20, candidateTarget - places.length),
        ...(pageToken ? { pageToken } : {}),
        ...(typeof filters.nota_min === "number" ? { minRating: filters.nota_min } : {}),
        ...(filters.recem_abertas ? { includeFutureOpeningBusinesses: true } : {}),
      });
      places.push(...(data.places ?? []));
      pageToken = data.nextPageToken;
    } while (pageToken && places.length < candidateTarget);

    return places.slice(0, candidateTarget).map((place) => ({
      nome: place.displayName?.text || "Empresa sem nome",
      segmento: place.primaryTypeDisplayName?.text ?? filters.nicho ?? null,
      endereco: place.formattedAddress ?? null,
      cidade: filters.cidade ?? null,
      uf: filters.uf ?? null,
      telefone: place.internationalPhoneNumber ?? place.nationalPhoneNumber ?? null,
      whatsapp: null,
      email: null,
      site: place.websiteUri ?? null,
      rating: place.rating ?? null,
      reviews_count: place.userRatingCount ?? 0,
      horario_funcionamento: place.regularOpeningHours?.weekdayDescriptions?.join(" | ") ?? null,
      activity_recent: place.businessStatus === "OPERATIONAL",
      source: this.name,
      source_ref: place.id ?? null,
      is_demo: false,
      raw: {
        google_maps_uri: place.googleMapsUri,
        business_status: place.businessStatus,
        opening_date: place.openingDate,
      },
    }));
  }
}
