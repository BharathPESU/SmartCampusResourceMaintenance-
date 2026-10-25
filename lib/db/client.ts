import { PGlite } from '@electric-sql/pglite';
import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

export interface DatabaseStatus {
  engine: 'PGlite (Embedded PostgreSQL 16 WASM)' | 'PostgreSQL (External Database)';
  configured: boolean;
  connected: boolean;
  version: string;
  tablesCount: number;
  recordsCount: Record<string, number>;
  lastChecked: string;
  error?: string;
}

let pgliteInstance: PGlite | null = null;
let pgPoolInstance: Pool | null = null;
let isInitialized = false;
let initPromise: Promise<void> | null = null;

const DATABASE_URL = process.env.DATABASE_URL;

/**
 * Initializes database client and runs initial migration if tables do not exist.
 */
export async function getDb() {
  if (isInitialized) {
    return {
      query: runQuery,
      status: getDatabaseStatus,
    };
  }

  if (initPromise) {
    await initPromise;
    return {
      query: runQuery,
      status: getDatabaseStatus,
    };
  }

  initPromise = (async () => {
    try {
      if (DATABASE_URL && DATABASE_URL.trim() !== '') {
        pgPoolInstance = new Pool({
          connectionString: DATABASE_URL,
          ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
        });
        // Test connection
        await pgPoolInstance.query('SELECT 1');
      } else {
        // Fallback to PGlite in-process PostgreSQL 16
        if (!pgliteInstance) {
          pgliteInstance = new PGlite();
        }
      }

      // Check if schema already exists
      const checkTables = await runRawQuery(
        "SELECT count(*) as count FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'buildings'"
      );
      const count = Number(checkTables.rows?.[0]?.count || 0);

      if (count === 0) {
        // Run migration script
        const migrationPath = path.join(process.cwd(), 'drizzle/migrations/0000_smart_campus.sql');
        let migrationSql = '';
        if (fs.existsSync(migrationPath)) {
          migrationSql = fs.readFileSync(migrationPath, 'utf-8');
        }

        if (migrationSql) {
          // Execute migration statements
          await executeSqlScript(migrationSql);
        }

        isInitialized = true;

        // Run seed data
        const { seedDatabase } = await import('./seed');
        await seedDatabase();
      }

      isInitialized = true;
    } catch (err: any) {
      console.error('Database initialization error:', err);
      // Even if external pool failed, fall back to pglite
      if (!pgliteInstance) {
        pgliteInstance = new PGlite();
        const migrationPath = path.join(process.cwd(), 'drizzle/migrations/0000_smart_campus.sql');
        if (fs.existsSync(migrationPath)) {
          const migrationSql = fs.readFileSync(migrationPath, 'utf-8');
          await executeSqlScript(migrationSql);
        }
        isInitialized = true;
        const { seedDatabase } = await import('./seed');
        await seedDatabase();
      }
    }
  })();

  await initPromise;
  return {
    query: runQuery,
    status: getDatabaseStatus,
  };
}

async function runRawQuery(sql: string, params: any[] = []): Promise<{ rows: any[]; rowCount: number }> {
  if (pgPoolInstance) {
    const res = await pgPoolInstance.query(sql, params);
    return { rows: res.rows, rowCount: res.rowCount || 0 };
  } else if (pgliteInstance) {
    const res = await pgliteInstance.query(sql, params);
    return { rows: res.rows as any[], rowCount: res.rows?.length || 0 };
  }
  throw new Error('No database client initialized');
}

/**
 * Executes a parameterized SQL query safely against PostgreSQL.
 */
export async function runQuery<T = any>(sql: string, params: any[] = []): Promise<{ rows: T[]; rowCount: number }> {
  await getDb();
  return runRawQuery(sql, params);
}

/**
 * Executes a multiple statement SQL script.
 */
export async function executeSqlScript(script: string): Promise<void> {
  if (pgPoolInstance) {
    await pgPoolInstance.query(script);
  } else if (pgliteInstance) {
    await pgliteInstance.exec(script);
  }
}

/**
 * Returns comprehensive database status and metrics for the DBMS Lab and Health Check.
 */
export async function getDatabaseStatus(): Promise<DatabaseStatus> {
  const isExternal = !!DATABASE_URL && DATABASE_URL.trim() !== '';
  try {
    await getDb();
    const versionRes = await runRawQuery('SELECT version()');
    const versionStr = versionRes.rows?.[0]?.version || 'PostgreSQL 16.x';

    // Count records across all 9 entities
    const tables = [
      'buildings',
      'rooms',
      'assets',
      'facilities',
      'user_profiles',
      'staff_profiles',
      'bookings',
      'confirmations',
      'complaints',
      'outbox_events',
      'complaint_embeddings',
    ];

    const recordsCount: Record<string, number> = {};
    for (const tbl of tables) {
      try {
        const cRes = await runRawQuery(`SELECT count(*) as count FROM ${tbl}`);
        recordsCount[tbl] = Number(cRes.rows?.[0]?.count || 0);
      } catch {
        recordsCount[tbl] = 0;
      }
    }

    return {
      engine: isExternal ? 'PostgreSQL (External Database)' : 'PGlite (Embedded PostgreSQL 16 WASM)',
      configured: true,
      connected: true,
      version: versionStr,
      tablesCount: Object.keys(recordsCount).length,
      recordsCount,
      lastChecked: new Date().toISOString(),
    };
  } catch (err: any) {
    return {
      engine: isExternal ? 'PostgreSQL (External Database)' : 'PGlite (Embedded PostgreSQL 16 WASM)',
      configured: isExternal,
      connected: false,
      version: 'Unknown',
      tablesCount: 0,
      recordsCount: {},
      lastChecked: new Date().toISOString(),
      error: err?.message || 'Database connection error',
    };
  }
}
