import type {
  LandUseCommandResult,
  LandUseFormSnapshot,
  LandUseFormTemplate,
  SaveLandUseInput,
} from "./land-use-form";

export interface LandUseFormRepository {
  getTemplate(): Promise<LandUseFormTemplate | null>;
  getById(id: string): Promise<LandUseFormSnapshot | null>;
  save(input: SaveLandUseInput): Promise<LandUseCommandResult>;
}
