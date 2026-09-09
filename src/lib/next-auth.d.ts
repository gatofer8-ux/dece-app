import { DefaultSession } from "next-auth";
import type { Role } from "./types";

/** Estado de la suscripción individual del usuario, resuelto en `getSession()`. */
export interface SessionSubscription {
  id?: string;
  status: string;
  package_id?: string | null;
  package_name?: string | null;
  billing_type?: string | null;
  frozen_price?: number | null;
  frozen_duration_months?: number | null;
  start_date?: string | null;
  end_date?: string | null;
  days_left: number | null;
  is_overdue?: boolean;
  is_demo: boolean;
  is_trial: boolean;
  is_read_only: boolean;
}

interface DeceSessionUser {
  id: string;
  role: Role;
  institution_id: string | null;
  is_demo_mode?: boolean;
  real_institution_id?: string | null;
  is_delegated_coordinator?: boolean;
  delegation_info?: Record<string, unknown> | null;
  subscription?: SessionSubscription;
}

declare module "next-auth" {
  interface Session {
    user: DeceSessionUser & DefaultSession["user"];
  }
  interface User {
    id: string;
    role: Role;
    institution_id: string | null;
    is_demo_mode?: boolean;
    real_institution_id?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
    institution_id: string | null;
  }
}
