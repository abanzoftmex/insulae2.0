import type { UseCase } from "@/shared/application/use-case";

import type {
  PrivateAreaListing,
  PrivateAreaListingFilters,
  PrivateAreaStatusFilter,
} from "../domain/private-area-listing";
import type { PrivateAreaListingRepository } from "../domain/private-area-listing.repository";

interface RawFilters {
  query?: string;
  useType?: string;
  status?: string;
  m2Min?: number | null;
  m2Max?: number | null;
  page?: number;
  pageSize?: number;
  paginateByTopLevel?: boolean;
}

const DEFAULT_PAGE_SIZE = 30;
const MAX_PAGE_SIZE = 80;

function normalizeStatus(value: string | undefined): PrivateAreaStatusFilter {
  if (value === "ACTIVE" || value === "INACTIVE" || value === "ALL") {
    return value;
  }

  return "ALL";
}

function normalizeNumber(value: number | null | undefined): number | null {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return null;
  }

  return value;
}

function normalizePositiveInt(value: number | undefined, fallback: number): number {
  if (!value || Number.isNaN(value)) {
    return fallback;
  }

  return Math.max(1, Math.floor(value));
}

export class GetPrivateAreaListingUseCase
  implements UseCase<RawFilters | undefined, PrivateAreaListing | null>
{
  constructor(private readonly repository: PrivateAreaListingRepository) {}

  async execute(input?: RawFilters): Promise<PrivateAreaListing | null> {
    const page = normalizePositiveInt(input?.page, 1);
    const requestedPageSize = normalizePositiveInt(input?.pageSize, DEFAULT_PAGE_SIZE);

    const filters: PrivateAreaListingFilters = {
      query: (input?.query ?? "").trim(),
      useType: (input?.useType ?? "").trim(),
      status: normalizeStatus(input?.status),
      m2Min: normalizeNumber(input?.m2Min),
      m2Max: normalizeNumber(input?.m2Max),
      page,
      pageSize: Math.min(requestedPageSize, MAX_PAGE_SIZE),
      paginateByTopLevel: input?.paginateByTopLevel === true,
    };

    return this.repository.getListing(filters);
  }
}
