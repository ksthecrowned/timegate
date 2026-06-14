import { PrismaPg } from '@prisma/adapter-pg';
import { Mutex } from 'async-mutex';
import type { Pool } from 'pg';

type PgPerformIO = {
  performIO: (query: unknown) => Promise<unknown>;
};

type PgAdapter = Awaited<ReturnType<PrismaPg['connect']>>;

/**
 * Serialize queries on a single pg transaction client.
 * Workaround for pg>=8.20 deprecation until Prisma merges adapter-pg mutex fix.
 * @see https://github.com/prisma/prisma/issues/29407
 */
function wrapTransaction(tx: PgPerformIO): void {
  const mutex = new Mutex();
  const originalPerformIO = tx.performIO.bind(tx);
  tx.performIO = (query: unknown) => mutex.runExclusive(() => originalPerformIO(query));
}

/**
 * PrismaPg factory that mutex-wraps PgTransaction.performIO.
 */
export function createPrismaPg(pool: Pool): PrismaPg {
  const factory = new PrismaPg(pool);
  const originalConnect = factory.connect.bind(factory);

  factory.connect = async () => {
    const adapter: PgAdapter = await originalConnect();
    const originalStartTransaction = adapter.startTransaction.bind(adapter);

    adapter.startTransaction = async (isolationLevel) => {
      const tx = await originalStartTransaction(isolationLevel);
      wrapTransaction(tx as unknown as PgPerformIO);
      return tx;
    };

    return adapter;
  };

  return factory;
}
