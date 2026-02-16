export type Role = 'admin' | 'manager' | 'employee' | 'hr';

export interface User {
  id: string;            // ✅ REQUIRED
  name: string;
  email: string;
  role: Role;
}
