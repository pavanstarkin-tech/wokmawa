export interface DatabaseAdapter {
  execute(sql: string, params?: any[]): Promise<{ changes: number; lastInsertRowid: number | string }>;
  query<T = any>(sql: string, params?: any[]): Promise<T[]>;
  transaction(queries: Array<{ sql: string; params?: any[] }>): Promise<void>;
  backup(): Promise<{ success: boolean; filePath?: string; error?: string }>;
  restore(backupPath: string): Promise<{ success: boolean; error?: string }>;
  vacuum(): Promise<void>;
  close(): Promise<void>;
  healthCheck(): Promise<{ healthy: boolean; details?: string }>;
}
export default DatabaseAdapter;
