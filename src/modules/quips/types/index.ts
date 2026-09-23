/** What a quip says — everything the panel renders, without the record around it. */
export interface QuipContent {
  text: string;
  /** The line the quip answers, shown above it. */
  quote?: string | null;
  /** Who said the quote. Shown only alongside one. */
  attribution?: string | null;
}

export interface Quip extends QuipContent {
  id: string;
  enabled: boolean | null;
  createdAt: string;
  updatedAt: string | null;
}
