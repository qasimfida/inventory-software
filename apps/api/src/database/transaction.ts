import type { Pool, QueryResult, QueryResultRow } from 'pg';

export interface Transaction {
  query<Row extends QueryResultRow = QueryResultRow>(
    text: string,
    values?: unknown[],
  ): Promise<QueryResult<Row>>;
}

export async function inTransaction<T>(
  pool: Pick<Pool, 'connect'>,
  work: (transaction: Transaction) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  let active = true;
  let discard = false;
  const transaction: Transaction = {
    query: (text, values) => {
      if (!active) return Promise.reject(new Error('Transaction scope has ended.'));
      return client.query(text, values);
    },
  };
  try {
    await client.query('BEGIN');
    const result = await work(transaction);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch {
      discard = true;
    }
    throw error;
  } finally {
    active = false;
    client.release(discard);
  }
}
