export interface User {
  username: string;
  role: string;
  rights: string[];
  status: 'ENABLED' | 'DISABLED';
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  avatar?: string | null;
  lastLogin?: string | null;
  createdAt: string;
}
