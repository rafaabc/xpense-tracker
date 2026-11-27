import {
  pgTable,
  text,
  timestamp,
  integer,
  boolean,
  numeric,
  date,
  primaryKey,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// Auth.js required tables (user table extended with currency preference)
export const users = pgTable("user", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
  currency: text("currency", { enum: ["DKK", "BRL"] }).notNull().default("DKK"),
});

export const accounts = pgTable(
  "account",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => [
    primaryKey({ columns: [account.provider, account.providerAccountId] }),
  ]
);

export const sessions = pgTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (vt) => [primaryKey({ columns: [vt.identifier, vt.token] })]
);

// Domain tables
export const groups = pgTable(
  "group",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    // Case-insensitive unique name per user (US-06)
    uniqueIndex("group_lower_name_user_idx").on(
      sql`lower(${t.name})`,
      t.userId
    ),
  ]
);

export const subcategories = pgTable(
  "subcategory",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    groupId: text("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    // Case-insensitive unique name within parent group (US-07)
    uniqueIndex("subcategory_lower_name_group_idx").on(
      sql`lower(${t.name})`,
      t.groupId
    ),
  ]
);

// People the user shares costs with; exactly one row per user is the user (US-16)
export const people = pgTable(
  "person",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    isSelf: boolean("is_self").notNull().default(false),
    // Default split in basis points; the user's people always total 10000 (US-17)
    defaultShareBps: integer("default_share_bps").notNull().default(0),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("person_lower_name_user_idx").on(
      sql`lower(${t.name})`,
      t.userId
    ),
    uniqueIndex("person_self_user_idx").on(t.userId).where(sql`${t.isSelf}`),
  ]
);

export const expenses = pgTable("expense", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  subcategoryId: text("subcategory_id")
    .notNull()
    .references(() => subcategories.id, { onDelete: "cascade" }),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  date: date("date", { mode: "string" }).notNull(),
  // null only on rows created before US-18 or by recurrence; read as the user
  // "no action" (not "restrict") so deleting a user can cascade through both tables
  payerPersonId: text("payer_person_id").references(() => people.id, {
    onDelete: "no action",
  }),
  splitMode: text("split_mode", { enum: ["personal", "split"] })
    .notNull()
    .default("personal"),
  // Set on expenses generated from a template (US-21)
  recurringTemplateId: text("recurring_template_id").references(
    () => recurringTemplates.id,
    { onDelete: "set null" }
  ),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

// Snapshot of how a split expense is divided (US-19)
export const expenseShares = pgTable(
  "expense_share",
  {
    expenseId: text("expense_id")
      .notNull()
      .references(() => expenses.id, { onDelete: "cascade" }),
    personId: text("person_id")
      .notNull()
      .references(() => people.id, { onDelete: "no action" }),
    shareBps: integer("share_bps").notNull(),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.expenseId, t.personId] })]
);

export const recurringTemplates = pgTable("recurring_template", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  subcategoryId: text("subcategory_id")
    .notNull()
    .references(() => subcategories.id, { onDelete: "cascade" }),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  startDate: date("start_date", { mode: "string" }).notNull(),
  interval: text("interval", { enum: ["monthly", "6mo", "12mo"] }).notNull(),
  dayOfMonth: integer("day_of_month").notNull(),
  active: boolean("active").notNull().default(true),
  lastRenewedAt: date("last_renewed_at", { mode: "string" }),
  lastGeneratedDate: date("last_generated_date", { mode: "string" }),
  // Copied to every generated expense; null is read as the user (US-21)
  payerPersonId: text("payer_person_id").references(() => people.id, {
    onDelete: "no action",
  }),
  splitMode: text("split_mode", { enum: ["personal", "split"] })
    .notNull()
    .default("personal"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

export const recurringTemplateShares = pgTable(
  "recurring_template_share",
  {
    templateId: text("template_id")
      .notNull()
      .references(() => recurringTemplates.id, { onDelete: "cascade" }),
    personId: text("person_id")
      .notNull()
      .references(() => people.id, { onDelete: "no action" }),
    shareBps: integer("share_bps").notNull(),
  },
  (t) => [primaryKey({ columns: [t.templateId, t.personId] })]
);
