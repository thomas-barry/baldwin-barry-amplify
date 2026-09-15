/** An approved complaint as the public page receives it. */
export interface PublicComplaint {
  id: string;
  text: string;
  nickname: string | null;
  dissatisfaction: number;
  /** The submission date alone, `YYYY-MM-DD` in UTC. Never the time. */
  submittedOn: string;
  /** The Management's response, if there is one. */
  response: string | null;
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
  response: string | null;
  /** When the response was last saved. */
  respondedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
