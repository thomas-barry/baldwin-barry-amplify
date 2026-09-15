/** An approved complaint as the public page receives it. */
export interface PublicComplaint {
  id: string;
  text: string;
  nickname: string | null;
  dissatisfaction: number;
  /** The submission date alone, `YYYY-MM-DD` in UTC. Never the time. */
  submittedOn: string;
}

export interface PublicComplaintPage {
  items: PublicComplaint[];
  nextToken: string | null;
}

export type ComplaintStatus = 'PENDING' | 'APPROVED';

/** The full stored row, which only admins can read. */
export interface Complaint {
  id: string;
  text: string;
  nickname: string | null;
  dissatisfaction: number;
  status: ComplaintStatus;
  submittedAt: string;
  createdAt: string;
  updatedAt: string;
}
