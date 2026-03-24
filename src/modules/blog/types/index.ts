export interface BlogPost {
  id: string;
  title: string;
  content: string;
  excerpt: string | null;
  tags: (string | null)[] | null;
  published: boolean;
  publishedDate: string | null;
  createdAt: string;
  updatedAt: string | null;
}
