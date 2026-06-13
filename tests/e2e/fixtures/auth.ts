import { neon } from "@neondatabase/serverless";
import crypto from "crypto";

export interface TestSession {
  userId: string;
  sessionToken: string;
  expires: Date;
}

export async function createTestSession(): Promise<TestSession> {
  const sql = neon(process.env.DATABASE_URL!);
  const userId = crypto.randomUUID();
  const sessionToken = crypto.randomUUID();
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await sql`
    INSERT INTO "user" (id, name, email, currency)
    VALUES (${userId}, 'E2E Test User', ${`e2e-${userId}@test.local`}, 'DKK')
  `;
  await sql`
    INSERT INTO session ("sessionToken", "userId", expires)
    VALUES (${sessionToken}, ${userId}, ${expires.toISOString()})
  `;

  return { userId, sessionToken, expires };
}

export async function deleteTestUser(userId: string): Promise<void> {
  const sql = neon(process.env.DATABASE_URL!);
  // Cascade deletes session + all user data
  await sql`DELETE FROM "user" WHERE id = ${userId}`;
}
