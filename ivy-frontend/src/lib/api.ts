export type AuthTokens = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type?: string;
};

export type CollectionResponse<T> = {
  limit: number;
  offset: number;
  count: number;
  total: number;
  has_more: boolean;
  results: T[];
};

const API_BASE = process.env.NEXT_PUBLIC_IVY_API_URL ?? 'https://solve.ivy.homes';
const API_KEY = process.env.NEXT_PUBLIC_IVY_API_KEY ?? '';
const TOKEN_KEY = 'ivy.auth.tokens';
const EXPIRY_KEY = 'ivy.auth.expiresAt';

type RequestOptions = RequestInit & {
  retryAuth?: boolean;
};

function browserStorage(): Storage | null {
  return typeof window === 'undefined' ? null : window.localStorage;
}

function readTokens(): AuthTokens | null {
  const storage = browserStorage();
  if (!storage) return null;
  const raw = storage.getItem(TOKEN_KEY);
  return raw ? (JSON.parse(raw) as AuthTokens) : null;
}

function saveTokens(tokens: AuthTokens): void {
  const storage = browserStorage();
  if (!storage) return;
  storage.setItem(TOKEN_KEY, JSON.stringify(tokens));
  storage.setItem(EXPIRY_KEY, String(Date.now() + tokens.expires_in * 1000));
}

function clearTokens(): void {
  const storage = browserStorage();
  storage?.removeItem(TOKEN_KEY);
  storage?.removeItem(EXPIRY_KEY);
}

function accessTokenNeedsRefresh(): boolean {
  const storage = browserStorage();
  if (!storage) return false;
  const expiresAt = Number(storage.getItem(EXPIRY_KEY) ?? 0);
  return expiresAt > 0 && Date.now() >= expiresAt - 60_000;
}

async function refresh(): Promise<AuthTokens> {
  const tokens = readTokens();
  if (!tokens?.refresh_token) throw new Error('No refresh token available');

  const response = await fetch(`${API_BASE}/auth/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY
    },
    body: JSON.stringify({ refresh_token: tokens.refresh_token })
  });

  if (!response.ok) {
    clearTokens();
    throw new Error(`Token refresh failed (${response.status})`);
  }

  const nextTokens = (await response.json()) as AuthTokens;
  saveTokens(nextTokens);
  return nextTokens;
}

export async function login(email: string, password: string): Promise<AuthTokens> {
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY
    },
    body: JSON.stringify({ email, password })
  });

  if (!response.ok) {
    throw new Error(`Login failed (${response.status}): ${await response.text()}`);
  }

  const tokens = (await response.json()) as AuthTokens;
  saveTokens(tokens);
  return tokens;
}

export { refresh, clearTokens };

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { retryAuth = true, headers, ...init } = options;
  let tokens = readTokens();

  if (tokens?.refresh_token && accessTokenNeedsRefresh()) {
    tokens = await refresh();
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY,
      ...(tokens?.access_token ? { Authorization: `Bearer ${tokens.access_token}` } : {}),
      ...headers
    }
  });

  if (response.status === 401 && retryAuth && tokens?.refresh_token) {
    await refresh();
    return request<T>(path, { ...options, retryAuth: false });
  }

  if (!response.ok) {
    throw new Error(`${response.status}: ${await response.text()}`);
  }

  return (await response.json()) as T;
}

export type Listing = Record<string, unknown> & { listing_id: string };
export type Rental = Record<string, unknown> & { listing_id: string };
export type Project = Record<string, unknown> & { project_id: string };

export type ListingRecord = Listing & {
  apartment_name?: string;
  locality?: string;
  property_type?: string;
  bedroom?: number;
  furnishing?: string;
  price?: number;
  carpet_area?: number;
  description?: string;
  floor?: number;
  total_floors?: number;
  is_live?: boolean;
  is_verified?: boolean;
};

export type RentalRecord = Rental & {
  title?: string;
  apartment_name?: string;
  locality?: string;
  bedroom?: number;
  furnishing?: string;
  price?: number;
  carpet_area?: number;
};

export type ProjectRecord = Project & {
  apartment_name?: string;
  developer_name?: string;
  locality?: string;
  project_status?: string;
  price_min?: number;
  price_max?: number;
  total_listings?: number;
};

export function listListings(params: Record<string, string | number> = {}) {
  return listCollection<Listing>('/v1/listings', params);
}

export function listRentals(params: Record<string, string | number> = {}) {
  return listCollection<Rental>('/v1/rentals', params);
}

export function listProjects(params: Record<string, string | number> = {}) {
  return listCollection<Project>('/v1/projects', params);
}

export function getCollectionPage<T>(path: string, offset: number, limit = 50, params: Record<string, string | number> = {}) {
  const query = new URLSearchParams({
    ...Object.fromEntries(Object.entries(params).map(([key, value]) => [key, String(value)])),
    offset: String(offset),
    limit: String(limit)
  });
  return request<CollectionResponse<T>>(`${path}?${query.toString()}`);
}

export async function listCollection<T>(
  path: string,
  params: Record<string, string | number> = {},
  limit = 50
): Promise<T[]> {
  const results: T[] = [];
  let offset = 0;

  while (true) {
    const query = new URLSearchParams({
      ...Object.fromEntries(Object.entries(params).map(([key, value]) => [key, String(value)])),
      offset: String(offset),
      limit: String(limit)
    });
    const page = await request<CollectionResponse<T>>(`${path}?${query.toString()}`);
    results.push(...page.results);

    if (!page.has_more || page.count === 0) break;
    offset += page.count;
  }

  return results;
}

export function getListing(id: string) {
  return request<Listing>(`/v1/listings/${encodeURIComponent(id)}`);
}

// The documented /v1/favourites and /v1/analytics/summary routes returned 404 in live checks.
// Keep them out of the client until the service exposes a working replacement.
