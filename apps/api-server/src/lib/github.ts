const GITHUB_API = "https://api.github.com";

export interface GhUser {
  login: string;
  name: string | null;
  avatar_url: string;
  html_url: string;
  bio: string | null;
  public_repos: number;
  followers: number;
  following: number;
}

export interface GhRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  watchers_count: number;
  open_issues_count: number;
  private: boolean;
  fork: boolean;
  archived: boolean;
  pushed_at: string | null;
  created_at: string | null;
  owner: { login: string };
}

export interface GhTrafficBucket {
  timestamp: string;
  count: number;
  uniques: number;
}

export interface GhViewsTraffic {
  count: number;
  uniques: number;
  views?: GhTrafficBucket[];
}

export interface GhClonesTraffic {
  count: number;
  uniques: number;
  clones?: GhTrafficBucket[];
}

export interface GhReferrer {
  referrer: string;
  count: number;
  uniques: number;
}

export interface GhPath {
  path: string;
  title: string;
  count: number;
  uniques: number;
}

export class GitHubApiError extends Error {
  readonly status: number;
  constructor(status: number, path: string, body: string) {
    super(`GitHub API error ${status} on ${path}: ${body.slice(0, 200)}`);
    this.name = "GitHubApiError";
    this.status = status;
  }
}

function authHeaders(): Record<string, string> {
  const token = process.env["GITHUB_TOKEN"];
  if (!token) {
    throw new Error("GITHUB_TOKEN environment variable is not set");
  }
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "repo-rank-dashboard",
  };
}

export async function ghFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${GITHUB_API}${path}`, { headers: authHeaders() });
  if (!res.ok) {
    throw new GitHubApiError(res.status, path, await res.text());
  }
  return (await res.json()) as T;
}

export async function fetchOwnerRepos(username: string): Promise<GhRepo[]> {
  const PAGE_SIZE = 100;
  const MAX_PAGES = 20;
  const target = username.toLowerCase();
  const all: GhRepo[] = [];

  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const batch = await ghFetch<GhRepo[]>(
      `/user/repos?per_page=${PAGE_SIZE}&affiliation=owner&sort=pushed&page=${page}`,
    );
    if (!Array.isArray(batch) || batch.length === 0) break;

    for (const repo of batch) {
      if (repo.owner?.login?.toLowerCase() === target) {
        all.push(repo);
      }
    }

    if (batch.length < PAGE_SIZE) break;
  }

  return all;
}

export interface RepoTrafficResult {
  views: GhViewsTraffic;
  clones: GhClonesTraffic;
  error: string | null;
}

export async function fetchRepoTraffic(
  owner: string,
  repo: string,
): Promise<RepoTrafficResult> {
  try {
    const [views, clones] = await Promise.all([
      ghFetch<GhViewsTraffic>(`/repos/${owner}/${repo}/traffic/views`),
      ghFetch<GhClonesTraffic>(`/repos/${owner}/${repo}/traffic/clones`),
    ]);
    return { views, clones, error: null };
  } catch (err) {
    return {
      views: { count: 0, uniques: 0, views: [] },
      clones: { count: 0, uniques: 0, clones: [] },
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

export async function mapWithConcurrency<T, U>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<U>,
): Promise<U[]> {
  const results = new Array<U>(items.length);
  let cursor = 0;

  async function run(): Promise<void> {
    while (cursor < items.length) {
      const i = cursor++;
      results[i] = await worker(items[i]!, i);
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, run);
  await Promise.all(workers);
  return results;
}
