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

export interface SeededCategory {
  groupId: string;
  subcategoryId: string;
}

/**
 * Inserts a group and subcategory for the given user directly in Neon.
 * Deleted automatically via FK cascade when deleteTestUser is called.
 */
export async function seedCategory(userId: string): Promise<SeededCategory> {
  const sql = neon(process.env.DATABASE_URL!);
  const groupId = crypto.randomUUID();
  const subcategoryId = crypto.randomUUID();

  await sql`
    INSERT INTO "group" (id, user_id, name, created_at)
    VALUES (${groupId}, ${userId}, 'E2E Group', NOW())
  `;
  await sql`
    INSERT INTO subcategory (id, group_id, name, created_at)
    VALUES (${subcategoryId}, ${groupId}, 'E2E Subcategory', NOW())
  `;

  return { groupId, subcategoryId };
}

/**
 * Inserts an expense for the given user directly in Neon.
 * Deleted automatically via FK cascade when deleteTestUser is called.
 */
export async function seedExpense(
  userId: string,
  subcategoryId: string,
  amount: string,
  date: string
): Promise<string> {
  const sql = neon(process.env.DATABASE_URL!);
  const expenseId = crypto.randomUUID();

  await sql`
    INSERT INTO expense (id, user_id, subcategory_id, amount, date, created_at)
    VALUES (${expenseId}, ${userId}, ${subcategoryId}, ${amount}, ${date}, NOW())
  `;

  return expenseId;
}
