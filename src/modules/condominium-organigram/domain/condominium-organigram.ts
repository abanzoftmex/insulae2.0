export interface OrganigramUserOption {
  id: string;
  displayName: string;
}

export interface OrganigramPositionAssignee {
  userId: string;
  displayName: string;
}

export interface OrganigramPositionRow {
  positionId: string;
  positionName: string;
  maxAssignments: number;
  allowsAlternate: boolean;
  responsible: OrganigramPositionAssignee[];
  alternates: OrganigramPositionAssignee[];
}

export interface OrganigramGroupSection {
  groupId: string;
  groupName: string;
  groupPosition: number;
  rows: OrganigramPositionRow[];
}

export interface CondominiumOrganigramSnapshot {
  condominiumId: string;
  condominiumName: string;
  groups: OrganigramGroupSection[];
  userOptions: OrganigramUserOption[];
}

export interface SaveOrganigramPositionInput {
  positionId: string;
  responsibleUserIds: string[];
  alternateUserIds: string[];
}

export interface SaveCondominiumOrganigramInput {
  positions: SaveOrganigramPositionInput[];
}

export interface CondominiumOrganigramCommandResult {
  ok: boolean;
  message: string;
}
