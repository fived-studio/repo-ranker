import {
  Router,
  type IRouter,
  type NextFunction,
  type Request,
  type Response,
} from "express";
import rateLimit from "express-rate-limit";
import {
  GetMeResponse,
  ListRepoTrafficResponse,
  GetRepoTrafficDetailResponse,
} from "@repo-ranker/api-zod";

import { getCached, setCached, withCache } from "../lib/cache";
import {
  fetchOwnerRepos,
  fetchRepoTraffic,
  ghFetch,
  mapWithConcurrency,
  type GhPath,
  type GhReferrer,
  type GhRepo,
  type GhUser,
  type GhClonesTraffic,
  type GhViewsTraffic,
} from "../lib/github";

const REPOS_TTL_MS = 5 * 60 * 1000;
const TRAFFIC_TTL_MS = 5 * 60 * 1000;
const USER_TTL_MS = 60 * 60 * 1000;
const TRAFFIC_CONCURRENCY = 8;

const router: IRouter = Router();

router.use(
  rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many requests, please try again later." },
  }),
);
router.use(requireApiKey);

function requireApiKey(req: Request, res: Response, next: NextFunction): void {
  const apiKey = process.env["API_KEY"];
  if (!apiKey) {
    res.status(500).json({ error: "API_KEY environment variable is not configured" });
    return;
  }

  if (req.headers["x-api-key"] !== apiKey) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  next();
}

function getUsername(res: Response): string | null {
  const username = process.env["GITHUB_USERNAME"];
  if (!username) {
    res.status(500).json({ error: "GITHUB_USERNAME not configured" });
    return null;
  }
  return username;
}

function getUser(username: string): Promise<GhUser> {
  return withCache(`user:${username}`, USER_TTL_MS, () =>
    ghFetch<GhUser>(`/users/${username}`),
  );
}

function getRepoTraffic(repo: GhRepo) {
  return withCache(`traffic:${repo.full_name}`, TRAFFIC_TTL_MS, () =>
    fetchRepoTraffic(repo.owner.login, repo.name),
  );
}

function mapUser(user: GhUser) {
  return {
    login: user.login,
    name: user.name ?? null,
    avatarUrl: user.avatar_url,
    htmlUrl: user.html_url,
    bio: user.bio ?? null,
    publicRepos: user.public_repos,
    followers: user.followers,
    following: user.following,
  };
}

function mapRepo(
  repo: GhRepo,
  views: GhViewsTraffic,
  clones: GhClonesTraffic,
  trafficError: string | null = null,
) {
  return {
    id: repo.id,
    name: repo.name,
    fullName: repo.full_name,
    description: repo.description ?? null,
    htmlUrl: repo.html_url,
    language: repo.language ?? null,
    stars: repo.stargazers_count,
    forks: repo.forks_count,
    watchers: repo.watchers_count,
    openIssues: repo.open_issues_count,
    isPrivate: repo.private,
    isFork: repo.fork,
    isArchived: repo.archived,
    pushedAt: repo.pushed_at ?? null,
    createdAt: repo.created_at ?? null,
    views: { total: views.count ?? 0, unique: views.uniques ?? 0 },
    clones: { total: clones.count ?? 0, unique: clones.uniques ?? 0 },
    trafficError,
  };
}

function sendError(req: Request, res: Response, err: unknown, label: string): void {
  req.log.error({ err }, `${label} failed`);
  res.status(500).json({
    error: err instanceof Error ? err.message : "Unknown error",
  });
}

router.get("/me", async (req, res) => {
  try {
    const username = getUsername(res);
    if (!username) return;
    const user = await getUser(username);
    res.json(GetMeResponse.parse(mapUser(user)));
  } catch (err) {
    sendError(req, res, err, "/me");
  }
});

router.get("/repos", async (req, res) => {
  try {
    const username = getUsername(res);
    if (!username) return;

    const cacheKey = `repos:${username}`;
    const cached = getCached<unknown>(cacheKey);
    if (cached) {
      res.json(cached);
      return;
    }

    const [user, repos] = await Promise.all([
      getUser(username),
      fetchOwnerRepos(username),
    ]);

    const enriched = await mapWithConcurrency(repos, TRAFFIC_CONCURRENCY, async (repo) => {
      const { views, clones, error } = await getRepoTraffic(repo);
      return mapRepo(repo, views, clones, error);
    });

    enriched.sort((a, b) => {
      if (b.views.total !== a.views.total) return b.views.total - a.views.total;
      if (b.clones.total !== a.clones.total) return b.clones.total - a.clones.total;
      return b.stars - a.stars;
    });

    const totals = enriched.reduce(
      (acc, r) => {
        acc.views.total += r.views.total;
        acc.views.unique += r.views.unique;
        acc.clones.total += r.clones.total;
        acc.clones.unique += r.clones.unique;
        return acc;
      },
      {
        views: { total: 0, unique: 0 },
        clones: { total: 0, unique: 0 },
        repoCount: enriched.length,
      },
    );

    const payload = ListRepoTrafficResponse.parse({
      user: mapUser(user),
      repos: enriched,
      totals,
      fetchedAt: new Date().toISOString(),
    });

    setCached(cacheKey, payload, REPOS_TTL_MS);
    res.json(payload);
  } catch (err) {
    sendError(req, res, err, "/repos");
  }
});

router.get("/repos/:owner/:repo/traffic", async (req, res) => {
  try {
    const username = getUsername(res);
    if (!username) return;

    const { owner, repo } = req.params;
    if (owner.toLowerCase() !== username.toLowerCase()) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const cacheKey = `traffic-detail:${owner}/${repo}`;
    const cached = getCached<unknown>(cacheKey);
    if (cached) {
      res.json(cached);
      return;
    }

    const [repoRaw, views, clones, referrers, paths] = await Promise.all([
      ghFetch<GhRepo>(`/repos/${owner}/${repo}`),
      ghFetch<Required<GhViewsTraffic>>(`/repos/${owner}/${repo}/traffic/views`),
      ghFetch<Required<GhClonesTraffic>>(`/repos/${owner}/${repo}/traffic/clones`),
      ghFetch<GhReferrer[]>(`/repos/${owner}/${repo}/traffic/popular/referrers`),
      ghFetch<GhPath[]>(`/repos/${owner}/${repo}/traffic/popular/paths`),
    ]);

    const payload = GetRepoTrafficDetailResponse.parse({
      repo: mapRepo(repoRaw, views, clones),
      viewsSeries: (views.views ?? []).map(toBucket),
      clonesSeries: (clones.clones ?? []).map(toBucket),
      topReferrers: (referrers ?? []).map((r) => ({
        referrer: r.referrer,
        count: r.count,
        uniques: r.uniques,
      })),
      topPaths: (paths ?? []).map((p) => ({
        path: p.path,
        title: p.title,
        count: p.count,
        uniques: p.uniques,
      })),
    });

    setCached(cacheKey, payload, TRAFFIC_TTL_MS);
    res.json(payload);
  } catch (err) {
    sendError(req, res, err, "/repos/:owner/:repo/traffic");
  }
});

function toBucket(bucket: { timestamp: string; count: number; uniques: number }) {
  return { timestamp: bucket.timestamp, count: bucket.count, uniques: bucket.uniques };
}

export default router;
