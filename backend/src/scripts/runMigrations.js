const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { Client } = require('pg');
const config = require('../config/env');
const logger = require('../utils/logger');

// Local in-memory migration history map for fallback/test mode
const mockMigrationHistoryMap = new Map();

function calculateChecksum(content) {
  return crypto.createHash('sha256').update(content).digest('hex');
}

const getMigrationFiles = () => {
  const possiblePaths = [
    path.join(__dirname, '../../../supabase/migrations'),
    path.join(__dirname, '../../migrations'),
    path.join(process.cwd(), 'supabase/migrations'),
    path.join(process.cwd(), 'migrations')
  ];

  let migrationsDir = null;
  for (const dir of possiblePaths) {
    if (fs.existsSync(dir)) {
      migrationsDir = dir;
      break;
    }
  }

  if (!migrationsDir) {
    return { dir: null, files: [] };
  }

  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

  return { dir: migrationsDir, files };
};

async function executeMigrations({ dryRun = false } = {}) {
  const { dir, files } = getMigrationFiles();

  if (!dir || files.length === 0) {
    logger.warn('[MIGRATOR_WARN] No migration SQL files found in supabase/migrations directory.');
    return { success: true, executedCount: 0, totalFiles: 0, history: [] };
  }

  const dbUrl = config.databaseUrl || process.env.DATABASE_URL || '';
  const isRealDb = Boolean(dbUrl && (dbUrl.startsWith('postgresql://') || dbUrl.startsWith('postgres://')));

  let client = null;
  if (isRealDb) {
    client = new Client({
      connectionString: dbUrl,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 10000
    });
  }

  const migrationResults = [];

  try {
    if (client) {
      await client.connect();

      // Ensure schema_migration_history exists
      await client.query(`
        CREATE TABLE IF NOT EXISTS public.schema_migration_history (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          migration_name VARCHAR(255) NOT NULL UNIQUE,
          checksum VARCHAR(64) NOT NULL,
          executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          execution_duration_ms INTEGER NOT NULL DEFAULT 0,
          status VARCHAR(50) NOT NULL DEFAULT 'SUCCESS',
          executed_by VARCHAR(255) DEFAULT 'SYSTEM_MIGRATOR',
          metadata JSONB DEFAULT '{}'::jsonb
        );
      `);
    }

    for (const fileName of files) {
      const filePath = path.join(dir, fileName);
      const sqlContent = fs.readFileSync(filePath, 'utf8');
      const checksum = calculateChecksum(sqlContent);
      const startTime = Date.now();

      let alreadyApplied = false;
      let existingChecksum = null;

      if (client) {
        const historyRes = await client.query(
          'SELECT checksum FROM public.schema_migration_history WHERE migration_name = $1 AND status = $2',
          [fileName, 'SUCCESS']
        );
        if (historyRes.rows.length > 0) {
          alreadyApplied = true;
          existingChecksum = historyRes.rows[0].checksum;
        }
      } else {
        if (mockMigrationHistoryMap.has(fileName)) {
          alreadyApplied = true;
          existingChecksum = mockMigrationHistoryMap.get(fileName).checksum;
        }
      }

      if (alreadyApplied) {
        if (existingChecksum && existingChecksum !== checksum) {
          const err = new Error(`[MIGRATION_CHECKSUM_MUTATED] Migration '${fileName}' has been modified after execution! Expected: ${existingChecksum}, Actual: ${checksum}`);
          logger.error(err.message);
          throw err;
        }
        migrationResults.push({ name: fileName, status: 'SKIPPED_ALREADY_APPLIED', checksum });
        continue;
      }

      if (dryRun) {
        migrationResults.push({ name: fileName, status: 'DRY_RUN_PENDING', checksum });
        continue;
      }

      logger.info(`[MIGRATOR] Applying migration: ${fileName}...`);

      if (client) {
        try {
          await client.query('BEGIN');
          await client.query(sqlContent);

          const durationMs = Date.now() - startTime;
          await client.query(
            `INSERT INTO public.schema_migration_history (migration_name, checksum, execution_duration_ms, status, executed_by)
             VALUES ($1, $2, $3, $4, $5)`,
            [fileName, checksum, durationMs, 'SUCCESS', 'RUN_MIGRATIONS_SCRIPT']
          );
          await client.query('COMMIT');

          logger.info(`[MIGRATOR_SUCCESS] Applied ${fileName} in ${durationMs}ms`);
          migrationResults.push({ name: fileName, status: 'SUCCESS', durationMs, checksum });
        } catch (mErr) {
          await client.query('ROLLBACK');
          logger.error(`[MIGRATOR_FAILED] Migration '${fileName}' failed: ${mErr.message}`);
          throw new Error(`[MIGRATION_EXECUTION_FAILED] File ${fileName}: ${mErr.message}`);
        }
      } else {
        const durationMs = Date.now() - startTime;
        mockMigrationHistoryMap.set(fileName, {
          migration_name: fileName,
          checksum,
          executed_at: new Date().toISOString(),
          execution_duration_ms: durationMs,
          status: 'SUCCESS'
        });
        logger.info(`[MIGRATOR_MOCK] Applied ${fileName} in ${durationMs}ms (Mock Mode)`);
        migrationResults.push({ name: fileName, status: 'SUCCESS', durationMs, checksum });
      }
    }
  } finally {
    if (client) {
      await client.end().catch(() => {});
    }
  }

  const executedCount = migrationResults.filter(r => r.status === 'SUCCESS').length;
  return {
    success: true,
    executedCount,
    totalFiles: files.length,
    results: migrationResults,
    history: Array.from(mockMigrationHistoryMap.values())
  };
}

if (require.main === module) {
  executeMigrations()
    .then((res) => {
      console.log(`\n✅ Migration Execution Completed cleanly (${res.executedCount} newly applied, ${res.totalFiles} total migration files)`);
      process.exit(0);
    })
    .catch((err) => {
      console.error(`\n❌ Migration Execution Failed: ${err.message}`);
      process.exit(1);
    });
}

module.exports = {
  executeMigrations,
  getMigrationFiles,
  calculateChecksum,
  mockMigrationHistoryMap
};
