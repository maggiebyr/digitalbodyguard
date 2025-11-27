import "next-auth";
import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      personaVerifiedAt?: Date;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    personaVerifiedAt?: Date;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    personaVerifiedAt?: Date;
  }
}
