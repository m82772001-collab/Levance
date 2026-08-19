/**
 * Placeholder for generated Supabase types.
 *
 * Once the project is linked to a real Supabase instance, replace this
 * file with the generated output of:
 *
 *   npx supabase gen types typescript --project-id <project-id> > lib/db/types.ts
 *
 * Keeping a minimal hand-written shape here (rather than `any`) lets
 * the rest of the codebase type-check against the documented schema
 * in supabase/migrations before codegen is wired up.
 */
export type UserRole = "customer" | "admin";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          role: UserRole;
          created_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          role?: UserRole;
        };
        Update: {
          full_name?: string | null;
          role?: UserRole;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      user_role: UserRole;
    };
  };
}
