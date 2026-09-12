export interface User {
  id?: number;
  companyId: number;
  email: string;
  password?: string;
  role: string;
  refreshToken?: string | null;
}
