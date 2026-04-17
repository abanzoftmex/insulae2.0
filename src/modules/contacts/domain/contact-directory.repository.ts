import type { ContactDirectory } from "./contact-directory";

export interface ContactDirectoryRepository {
  getDirectory(): Promise<ContactDirectory | null>;
}
