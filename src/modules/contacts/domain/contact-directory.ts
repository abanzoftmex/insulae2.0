export interface ContactDirectoryType {
  id: string;
  name: string;
}

export interface ContactDirectoryEntry {
  id: string;
  typeId: string;
  typeName: string;
  name: string;
  value: string;
  linkUrl: string;
  linkTarget: "SAME_TAB" | "NEW_TAB";
  sortOrder: number;
}

export interface ContactDirectory {
  condominiumId: string;
  condominiumSlug: string;
  condominiumName: string;
  types: ContactDirectoryType[];
  entries: ContactDirectoryEntry[];
}
