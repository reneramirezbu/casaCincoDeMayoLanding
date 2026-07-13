/**
 * Minimal ambient type declarations for Node's built-in `node:sqlite` module.
 *
 * The installed `@types/node` (v20) predates `node:sqlite`, so we declare just
 * the surface our driver adapter (src/lib/prisma-sqlite-adapter.ts) uses. The
 * runtime module is provided by Node 22+.
 */
declare module "node:sqlite" {
  /** Metadata for one result column, as returned by StatementSync.columns(). */
  interface ColumnMetadata {
    /** Result column name (or alias). */
    name: string;
    /** Declared type of the underlying column, or null for expressions. */
    type: string | null;
    /** Underlying column name, or null. */
    column: string | null;
    /** Underlying table name, or null. */
    table: string | null;
    /** Underlying database name, or null. */
    database: string | null;
  }

  interface RunResult {
    changes: number | bigint;
    lastInsertRowid: number | bigint;
  }

  type SqlInputValue = null | number | bigint | string | Uint8Array;

  class StatementSync {
    all(...params: SqlInputValue[]): unknown[];
    get(...params: SqlInputValue[]): unknown;
    run(...params: SqlInputValue[]): RunResult;
    iterate(...params: SqlInputValue[]): IterableIterator<unknown>;
    columns(): ColumnMetadata[];
    setReturnArrays(enabled: boolean): void;
    setReadBigInts(enabled: boolean): void;
    setAllowBareNamedParameters(enabled: boolean): void;
    setAllowUnknownNamedParameters(enabled: boolean): void;
  }

  interface DatabaseSyncOptions {
    open?: boolean;
    readOnly?: boolean;
    enableForeignKeyConstraints?: boolean;
    enableDoubleQuotedStringLiterals?: boolean;
  }

  class DatabaseSync {
    constructor(path: string, options?: DatabaseSyncOptions);
    prepare(sql: string): StatementSync;
    exec(sql: string): void;
    close(): void;
  }

  export { DatabaseSync, StatementSync, ColumnMetadata, RunResult };
}
