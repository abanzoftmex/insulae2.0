export interface ZoneListItem {
  id: string;
  name: string;
  initials: string | null;
  activeSubzones: number;
  canDelete: boolean;
}

export interface ZoneListing {
  condominiumId: string;
  condominiumSlug: string;
  condominiumName: string;
  zones: ZoneListItem[];
}
