import type { ZoneListItem, ZoneListing } from "../domain/zone-listing";

export interface ZoneRowVM {
  id: string;
  name: string;
  initials: string;
  activeSubzones: string;
  canDelete: boolean;
}

export interface ZoneListingVM {
  condominiumName: string;
  condominiumSlug: string;
  totalZones: string;
  rows: ZoneRowVM[];
}

function mapRow(zone: ZoneListItem): ZoneRowVM {
  return {
    id: zone.id,
    name: zone.name,
    initials: zone.initials?.trim() ? zone.initials : "--",
    activeSubzones: zone.activeSubzones.toLocaleString("es-MX"),
    canDelete: zone.canDelete,
  };
}

export function toZoneListingVM(listing: ZoneListing): ZoneListingVM {
  return {
    condominiumName: listing.condominiumName,
    condominiumSlug: listing.condominiumSlug,
    totalZones: listing.zones.length.toLocaleString("es-MX"),
    rows: listing.zones.map(mapRow),
  };
}
