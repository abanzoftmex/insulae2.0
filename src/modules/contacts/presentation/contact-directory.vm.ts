import type {
  ContactDirectory,
  ContactDirectoryEntry,
  ContactDirectoryType,
} from "../domain/contact-directory";

export interface ContactDirectoryEntryVM {
  id: string;
  typeId: string;
  typeName: string;
  name: string;
  value: string;
  linkUrl: string;
  linkTarget: "SAME_TAB" | "NEW_TAB";
  linkTargetLabel: string;
  sortOrder: string;
  initials: string;
}

export interface ContactDirectoryTypeVM {
  id: string;
  name: string;
}

export interface ContactDirectoryVM {
  condominiumName: string;
  condominiumSlug: string;
  totalContacts: string;
  totalTypes: string;
  types: ContactDirectoryTypeVM[];
  entries: ContactDirectoryEntryVM[];
}

function initialsFrom(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "CT";
}

function mapType(type: ContactDirectoryType): ContactDirectoryTypeVM {
  return {
    id: type.id,
    name: type.name,
  };
}

function mapEntry(entry: ContactDirectoryEntry): ContactDirectoryEntryVM {
  return {
    id: entry.id,
    typeId: entry.typeId,
    typeName: entry.typeName,
    name: entry.name,
    value: entry.value,
    linkUrl: entry.linkUrl,
    linkTarget: entry.linkTarget,
    linkTargetLabel: entry.linkTarget === "NEW_TAB" ? "Nueva pestana" : "Misma pestana",
    sortOrder: entry.sortOrder.toString(),
    initials: initialsFrom(entry.name),
  };
}

export function toContactDirectoryVM(directory: ContactDirectory): ContactDirectoryVM {
  return {
    condominiumName: directory.condominiumName,
    condominiumSlug: directory.condominiumSlug,
    totalContacts: directory.entries.length.toLocaleString("es-MX"),
    totalTypes: directory.types.length.toLocaleString("es-MX"),
    types: directory.types.map(mapType),
    entries: directory.entries.map(mapEntry),
  };
}
