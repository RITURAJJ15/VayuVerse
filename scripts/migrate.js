import fs from "node:fs";
import path from "node:path";
import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Client } = pg;

const dbPassword =
  process.env.SUPABASE_DB_PASSWORD || process.argv[2];

if (!dbPassword) {
  console.error(`
[VayuVerse Migration] Error: Database password required.
Usage:
  node scripts/migrate.js <YOUR-DATABASE-PASSWORD>
  OR set SUPABASE_DB_PASSWORD in your environment.
`);
  process.exit(1);
}

const connectionString = `postgresql://postgres.dicqyoxhplzobaxsnokz:${encodeURIComponent(
  dbPassword
)}@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres`;

async function runMigration() {
  console.log("[VayuVerse Migration] Connecting to Supabase PostgreSQL pooler...");
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  });

  try {
    await client.connect();
    console.log("[VayuVerse Migration] Connected successfully.");

    const migrationPath = path.resolve(
      process.cwd(),
      "supabase/migrations/20261122000000_vayuverse_persistence_and_impact.sql"
    );
    const sql = fs.readFileSync(migrationPath, "utf-8");

    console.log("[VayuVerse Migration] Applying database migration...");
    await client.query(sql);
    console.log("[VayuVerse Migration] Migration completed successfully!");

    // Verify created tables
    const tableRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    console.log(
      "[VayuVerse Migration] Active tables in public schema:",
      tableRes.rows.map((r) => r.table_name)
    );

    // Verify RLS is enabled on all tables
    const rlsRes = await client.query(`
      SELECT relname, relrowsecurity 
      FROM pg_class 
      JOIN pg_namespace ON pg_namespace.oid = pg_class.relnamespace 
      WHERE nspname = 'public' AND relkind = 'r' 
      ORDER BY relname;
    `);
    console.log(
      "[VayuVerse Migration] RLS Status on public tables:",
      rlsRes.rows.map((r) => `${r.relname}: RLS=${r.relrowsecurity}`)
    );

    await client.end();
  } catch (err) {
    console.error("[VayuVerse Migration] Failed:", err.message);
    process.exit(1);
  }
}

runMigration();
