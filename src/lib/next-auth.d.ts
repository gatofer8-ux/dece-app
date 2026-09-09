import { DefaultSession } from "next-auth";
import type { Role } from "./types";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      institution_id: string | null;
      is_demo_mode?: boolean;
      real_institution_id?: string | null;
    } & DefaultSession["user"];
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
