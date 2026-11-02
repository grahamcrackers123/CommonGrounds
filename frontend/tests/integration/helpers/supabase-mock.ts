import type { SupabaseClient } from '@supabase/supabase-js';

export type SupabaseError = {
  message: string;
  code?: string;
} | null;

export type SupabaseResult = {
  data?: unknown;
  error?: SupabaseError;
};

type Chainable = {
  then: (
    onFulfilled?: ((value: SupabaseResult) => unknown) | null,
    onRejected?: ((reason: unknown) => unknown) | null
  ) => Promise<unknown>;
} & Record<string, jest.Mock>;

const CHAIN_METHODS = [
  'select',
  'insert',
  'update',
  'upsert',
  'delete',
  'eq',
  'neq',
  'gt',
  'gte',
  'lt',
  'lte',
  'like',
  'ilike',
  'is',
  'in',
  'not',
  'or',
  'order',
  'limit',
  'range',
  'maybeSingle',
  'single',
  'returns',
  'throwOnError',
] as const;

export function createQueryMock(
  result: SupabaseResult = { data: null, error: null }
): Chainable {
  const query = {} as Chainable;

  for (const method of CHAIN_METHODS) {
    query[method] = jest.fn(() => query);
  }

  query.then = (onFulfilled, onRejected) =>
    Promise.resolve(result).then(onFulfilled, onRejected);

  return query;
}

type MockOptions = {
  user?: { id: string } | null;
  authError?: SupabaseError;
  from?: (table: string) => Chainable;
  rpc?: (fn: string, args?: Record<string, unknown>) => Chainable;
};

export function createSupabaseMock(options: MockOptions = {}) {
  const user =
    options.user === undefined ? { id: 'test-user-id' } : options.user;

  const from = jest.fn((table: string) =>
    options.from ? options.from(table) : createQueryMock()
  );

  const rpc = jest.fn((fn: string, args?: Record<string, unknown>) =>
    options.rpc ? options.rpc(fn, args) : createQueryMock()
  );

  const authGetUser = jest.fn(async () => ({
    data: { user },
    error: options.authError ?? null,
  }));

  const client = {
    auth: { getUser: authGetUser },
    from,
    rpc,
  };

  return {
    client: client as unknown as SupabaseClient,
    from,
    rpc,
    authGetUser,
  };
}
