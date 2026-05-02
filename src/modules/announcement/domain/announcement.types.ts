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
}

export interface AnnouncementTopic {
  id: string;
  order: number;
  title: string;
  description: string | null;
}

export interface Announcement {
  id: string;
  name: string;
  type: AnnouncementType;
  subtype: AnnouncementSubtype;
  status: AnnouncementStatus;
  comments: string | null;
  guests: string | null;
  pdfUrl: string | null;
  expectedAttendance: number;
  actualAttendance: number;
  attendancePercentage: number;
  conveningPosition: string | null;
  moderatorPosition: string | null;
  dates: AnnouncementDate[];
  topics: AnnouncementTopic[];
  createdAt: Date;
}
