/**
 * Minimal Prisma 7 SQL driver adapter backed by Node's built-in `node:sqlite`.
 *
 * WHY THIS EXISTS
 * ---------------
 * Prisma 7 removed the built-in Rust query engine's direct DB connection: a
 * `PrismaClient` now REQUIRES a driver adapter (or an Accelerate URL). The
 * official SQLite adapter is `@prisma/adapter-better-sqlite3`, which pulls the
 * `better-sqlite3` native module. That native module is not installed in this
 * MVP environment, but Node 22 ships an experimental, dependency-free SQLite
 * binding (`node:sqlite`) that is more than sufficient for local dev. This file
 * implements the Prisma `SqlDriverAdapterFactory` contract on top of it.
 *
 * PRODUCTION NOTE: for prod, swap this for `@prisma/adapter-pg` (Neon Postgres)
 * or the official better-sqlite3 adapter. See ACTION-ITEMS.md. The rest of the
 * app depends only on the generated PrismaClient, so this swap is localized to
 * src/lib/db.ts.
 *
 * The contract (from the generated runtime types) is:
 *   SqlDriverAdapterFactory.connect() -> SqlDriverAdapter
 *   SqlDriverAdapter  = SqlQueryable + { executeScript, startTransaction, dispose, getConnectionInfo? }
 *   SqlQueryable      = { queryRaw(SqlQuery) -> SqlResultSet, executeRaw(SqlQuery) -> number }
 *   Transaction       = SqlQueryable + { options, commit(), rollback() }
 *   SqlQuery          = { sql: string, args: unknown[], argTypes: ArgType[] }
 *   SqlResultSet      = { columnNames: string[], columnTypes: number[], rows: unknown[][], lastInsertId? }
 */

import { DatabaseSync, type StatementSync } from "node:sqlite";
import type { SqlDriverAdapterFactory } from "@/generated/prisma/runtime/client";

// ── Prisma ColumnType enum (mirrored from the generated runtime; the const is
//    not exported so we redeclare the subset SQLite can produce). ─────────────
const ColumnType = {
  Int32: 0,
  Int64: 1,
  Float: 2,
  Double: 3,
  Numeric: 4,
  Boolean: 5,
  Text: 7,
  Date: 8,
  DateTime: 10,
  Json: 11,
  Bytes: 13,
  UnknownNumber: 128,
} as const;

/** The literal union of the ColumnType values above (a subset of Prisma's). */
type ColumnTypeValue = (typeof ColumnType)[keyof typeof ColumnType];

// ── Structural mirrors of the (non-exported) runtime types we must satisfy. ──
type ArgScalarType =
  | "string"
  | "int"
  | "bigint"
  | "float"
  | "decimal"
  | "boolean"
  | "enum"
  | "uuid"
  | "json"
  | "datetime"
  | "bytes"
  | "unknown";

interface ArgType {
  scalarType: ArgScalarType;
  dbType?: string;
  arity: "scalar" | "list";
}

interface SqlQuery {
  sql: string;
  args: unknown[];
  argTypes: ArgType[];
}

interface SqlResultSet {
  columnTypes: ColumnTypeValue[];
  columnNames: string[];
  rows: unknown[][];
  lastInsertId?: string;
}

interface SqlQueryable {
  readonly provider: "sqlite";
  readonly adapterName: string;
  queryRaw(params: SqlQuery): Promise<SqlResultSet>;
  executeRaw(params: SqlQuery): Promise<number>;
}

interface Transaction extends SqlQueryable {
  readonly options: { usePhantomQuery: boolean };
  commit(): Promise<void>;
  rollback(): Promise<void>;
}

interface SqlDriverAdapter extends SqlQueryable {
  executeScript(script: string): Promise<void>;
  startTransaction(isolationLevel?: string): Promise<Transaction>;
  getConnectionInfo?(): { supportsRelationJoins: boolean };
  dispose(): Promise<void>;
}

const ADAPTER_NAME = "node-sqlite (casa-mvp)";
const DEBUG = process.env.ADAPTER_DEBUG === "1";
function dlog(...a: unknown[]): void {
  if (DEBUG) console.error("[adapter]", ...a);
}

/** Resolve a Prisma `file:` URL to a filesystem path `node:sqlite` understands. */
function resolveDbPath(url: string): string {
  // Accept "file:./dev.db", "file:dev.db", or a bare path.
  const stripped = url.startsWith("file:") ? url.slice("file:".length) : url;
  // `node:sqlite` opens relative to process.cwd(); leave the relative path as-is.
  return stripped.length > 0 ? stripped : "./dev.db";
}

/**
 * Coerce a JS value into something `node:sqlite` can bind (null | number |
 * bigint | string | Uint8Array), guided by the Prisma-supplied arg type.
 */
function coerceArg(value: unknown, argType: ArgType | undefined): unknown {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "boolean") return value ? 1 : 0;
  if (value instanceof Uint8Array) return value;

  switch (argType?.scalarType) {
    case "boolean":
      return value ? 1 : 0;
    case "datetime":
      // Already normalized above if it was a Date; pass strings/numbers through.
      return value;
    case "json":
      return typeof value === "string" ? value : JSON.stringify(value);
    default:
      // number | bigint | string pass straight through.
      if (
        typeof value === "number" ||
        typeof value === "bigint" ||
        typeof value === "string"
      ) {
        return value;
      }
      // Fallback: serialize objects/arrays as JSON text.
      return JSON.stringify(value);
  }
}

function coerceArgs(query: SqlQuery): unknown[] {
  return query.args.map((v, i) => coerceArg(v, query.argTypes[i]));
}

/**
 * Map a SQLite *declared* column type (from `StatementSync.columns()`), with a
 * value fallback for expression columns that have no declared type, to a Prisma
 * ColumnType. This mirrors how the official SQLite adapters classify columns.
 */
function mapColumnType(
  declType: string | null,
  sample: unknown,
): ColumnTypeValue {
  if (declType) {
    const t = declType.toUpperCase();
    if (t.includes("INT")) return ColumnType.Int64;
    if (t.includes("CHAR") || t.includes("CLOB") || t.includes("TEXT")) {
      return ColumnType.Text;
    }
    if (t.includes("BLOB")) return ColumnType.Bytes;
    if (t.includes("BOOL")) return ColumnType.Boolean;
    if (t.includes("REAL") || t.includes("FLOA") || t.includes("DOUB")) {
      return ColumnType.Double;
    }
    if (t.includes("DECIMAL") || t.includes("NUMERIC")) return ColumnType.Numeric;
    // Order matters: DATETIME/TIMESTAMP before DATE.
    if (t.includes("DATETIME") || t.includes("TIMESTAMP")) {
      return ColumnType.DateTime;
    }
    if (t.includes("DATE")) return ColumnType.Date;
    if (t.includes("JSON")) return ColumnType.Json;
  }
  // No declared type (aggregates, literals): infer from the sampled value.
  switch (typeof sample) {
    case "bigint":
      return ColumnType.Int64;
    case "number":
      return Number.isInteger(sample) ? ColumnType.Int64 : ColumnType.Double;
    case "boolean":
      return ColumnType.Boolean;
    case "object":
      return sample instanceof Uint8Array
        ? ColumnType.Bytes
        : ColumnType.Text;
    default:
      return ColumnType.Text;
  }
}

/** Shared row-reading logic for both the base connection and transactions. */
function runQueryRaw(db: DatabaseSync, query: SqlQuery): SqlResultSet {
  dlog("queryRaw:", query.sql);
  const stmt: StatementSync = db.prepare(query.sql);
  stmt.setReturnArrays(true);
  const args = coerceArgs(query);
  // `.all()` works for SELECT and for INSERT/UPDATE/DELETE ... RETURNING.
  const rows = stmt.all(...(args as never[])) as unknown[][];
  const cols = stmt.columns();
  const sampleRow = rows[0];
  const columnNames = cols.map((c) => c.name);
  const columnTypes = cols.map((c, i) =>
    mapColumnType(c.type ?? null, sampleRow ? sampleRow[i] : null),
  );
  return { columnNames, columnTypes, rows };
}

function runExecuteRaw(db: DatabaseSync, query: SqlQuery): number {
  dlog("executeRaw:", query.sql);
  const stmt = db.prepare(query.sql);
  const args = coerceArgs(query);
  const result = stmt.run(...(args as never[]));
  return Number(result.changes);
}

/**
 * A tiny promise-chain mutex. `node:sqlite` (like better-sqlite3) is a single
 * synchronous connection, so two overlapping interactive transactions would
 * collide on `BEGIN`. Serializing transactions here makes concurrent bookings
 * QUEUE instead of erroring — which, combined with `BEGIN IMMEDIATE` below, is
 * exactly the serialization the anti-double-booking guarantee relies on. See
 * src/lib/inventory.ts for how holdInventory uses this.
 */
class Mutex {
  private tail: Promise<void> = Promise.resolve();
  acquire(): Promise<() => void> {
    let release!: () => void;
    const next = new Promise<void>((resolve) => (release = resolve));
    const prior = this.tail;
    this.tail = this.tail.then(() => next);
    return prior.then(() => release);
  }
}

class NodeSqliteTransaction implements Transaction {
  readonly provider = "sqlite" as const;
  readonly adapterName = ADAPTER_NAME;
  // usePhantomQuery: true => the engine issues BEGIN/COMMIT/ROLLBACK as "phantom"
  // markers that bypass executeRaw and instead invoke our startTransaction/
  // commit/rollback methods. THIS adapter therefore fully owns the real SQL
  // (BEGIN IMMEDIATE / COMMIT / ROLLBACK). With `false`, the engine would ALSO
  // send a literal COMMIT through executeRaw, double-committing. See the
  // interactive-transaction handling in the generated runtime.
  readonly options = { usePhantomQuery: true };
  private done = false;

  constructor(
    private readonly db: DatabaseSync,
    private readonly release: () => void,
  ) {}

  async queryRaw(params: SqlQuery): Promise<SqlResultSet> {
    return runQueryRaw(this.db, params);
  }

  async executeRaw(params: SqlQuery): Promise<number> {
    return runExecuteRaw(this.db, params);
  }

  async commit(): Promise<void> {
    if (this.done) return;
    this.done = true;
    try {
      this.db.exec("COMMIT");
    } finally {
      this.release();
    }
  }

  async rollback(): Promise<void> {
    if (this.done) return;
    this.done = true;
    try {
      this.db.exec("ROLLBACK");
    } finally {
      this.release();
    }
  }
}

class NodeSqliteAdapter implements SqlDriverAdapter {
  readonly provider = "sqlite" as const;
  readonly adapterName = ADAPTER_NAME;
  private readonly mutex = new Mutex();

  constructor(private readonly db: DatabaseSync) {}

  async queryRaw(params: SqlQuery): Promise<SqlResultSet> {
    return runQueryRaw(this.db, params);
  }

  async executeRaw(params: SqlQuery): Promise<number> {
    return runExecuteRaw(this.db, params);
  }

  async executeScript(script: string): Promise<void> {
    this.db.exec(script);
  }

  async startTransaction(): Promise<Transaction> {
    const release = await this.mutex.acquire();
    dlog("startTransaction -> BEGIN IMMEDIATE");
    try {
      // BEGIN IMMEDIATE acquires the write lock up front, so the re-check-then-
      // decrement in holdInventory() is atomic against every other writer.
      this.db.exec("BEGIN IMMEDIATE");
    } catch (err) {
      release();
      throw err;
    }
    return new NodeSqliteTransaction(this.db, release);
  }

  getConnectionInfo(): { supportsRelationJoins: boolean } {
    return { supportsRelationJoins: false };
  }

  async dispose(): Promise<void> {
    this.db.close();
  }
}

/**
 * Factory passed to `new PrismaClient({ adapter })`. Opens one SQLite
 * connection with sane pragmas (FK enforcement + a busy timeout so brief lock
 * contention retries instead of failing).
 */
export class PrismaNodeSqlite implements SqlDriverAdapterFactory {
  readonly provider = "sqlite" as const;
  readonly adapterName = ADAPTER_NAME;

  constructor(private readonly url: string) {}

  async connect(): Promise<SqlDriverAdapter> {
    const db = new DatabaseSync(resolveDbPath(this.url));
    db.exec("PRAGMA foreign_keys = ON");
    db.exec("PRAGMA busy_timeout = 5000");
    db.exec("PRAGMA journal_mode = WAL");
    return new NodeSqliteAdapter(db);
  }
}
