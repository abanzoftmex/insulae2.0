export interface AnnouncementType {
  id: string;
  name: string;
}

export interface AnnouncementSubtype {
  id: string;
  name: string;
}

export interface AnnouncementStatus {
  id: string;
  name: string;
  color: string | null;
}

export interface AnnouncementDate {
  id: string;
  date: Date;
  time: string | null;
  location: string | null;
  callType: string;
  status: string;
  checkedPositions?: string | null;
}

export interface AnnouncementTopic {
  id: string;
  order: number;
  title: string;
  description: string | null;
  presenterId?: string | null;
  durationMinutes?: number | null;
  actionType?: string | null;
  conclusions?: string | null;
  votesJson?: string | null;
}

export interface SpecialGuest {
  id: string;
  name: string;
  email: string | null;
}

export interface AnnouncementInvitedPosition {
  id: string;
  positionId: string;
}

export interface Announcement {
  id: string;
  name: string;
  typeId: string;
  type: AnnouncementType;
  subtypeId: string;
  subtype: AnnouncementSubtype;
  statusId: string;
  status: AnnouncementStatus;
  comments: string | null;
  guests: string | null;
  pdfUrl: string | null;
  expectedAttendance: number;
  actualAttendance: number;
  attendancePercentage: number;
  conveningPersonId?: string | null;
  conveningPosition: string | null;
  moderatorPersonId?: string | null;
  moderatorPosition: string | null;
  dates: AnnouncementDate[];
  topics: AnnouncementTopic[];
  invitedPositions?: AnnouncementInvitedPosition[];
  specialGuests?: SpecialGuest[];
  createdAt: Date;
}

