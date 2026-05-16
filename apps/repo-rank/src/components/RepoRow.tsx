import { formatDistanceToNow } from "date-fns";
import { Copy, ExternalLink, Eye, GitFork, Star } from "lucide-react";
import type { RepoTraffic } from "@repo-ranker/api-client-react";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export function RepoRow({
  repo,
  rank,
  onSelect,
}: {
  repo: RepoTraffic;
  rank: number;
  onSelect: () => void;
}) {
  const zeroTraffic = repo.views.total === 0 && repo.clones.total === 0;

  return (
    <div
      onClick={onSelect}
      className={`group bg-card border rounded-lg p-4 hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer flex items-center gap-4 ${
        zeroTraffic ? "opacity-60 grayscale" : ""
      }`}
    >
      <div className="w-8 text-center font-mono text-muted-foreground text-sm shrink-0">
        {rank}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="font-bold truncate text-base group-hover:text-primary transition-colors">
            {repo.name}
          </h3>
          {repo.isPrivate && <RepoBadge variant="outline">Private</RepoBadge>}
          {repo.isFork && <RepoBadge variant="outline">Fork</RepoBadge>}
          {repo.isArchived && <RepoBadge variant="secondary">Archived</RepoBadge>}
          <a
            href={repo.htmlUrl}
            target="_blank"
            rel="noreferrer"
            className="text-muted-foreground hover:text-primary ml-1"
            onClick={(e) => e.stopPropagation()}
            aria-label={`Open ${repo.name} on GitHub`}
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        {repo.description && (
          <p className="text-sm text-muted-foreground truncate max-w-2xl">{repo.description}</p>
        )}

        <div className="flex items-center gap-4 mt-2 text-xs font-mono text-muted-foreground">
          {repo.language && (
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-primary/80" />
              {repo.language}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Star className="w-3 h-3" /> {repo.stars}
          </span>
          <span className="flex items-center gap-1">
            <GitFork className="w-3 h-3" /> {repo.forks}
          </span>
          <span>Updated {repo.pushedAt ? `${formatDistanceToNow(new Date(repo.pushedAt))} ago` : "never"}</span>
        </div>
      </div>

      <div className="flex items-center gap-6 shrink-0 text-right font-mono">
        <TrafficStat icon={<Eye className="w-3.5 h-3.5" />} label="Views" total={repo.views.total} unique={repo.views.unique} />
        <TrafficStat icon={<Copy className="w-3.5 h-3.5" />} label="Clones" total={repo.clones.total} unique={repo.clones.unique} />
      </div>
    </div>
  );
}

function RepoBadge({
  variant,
  children,
}: {
  variant: "outline" | "secondary";
  children: React.ReactNode;
}) {
  return (
    <Badge variant={variant} className="text-[10px] uppercase">
      {children}
    </Badge>
  );
}

function TrafficStat({
  icon,
  label,
  total,
  unique,
}: {
  icon: React.ReactNode;
  label: string;
  total: number;
  unique: number;
}) {
  return (
    <div>
      <div className="flex items-center justify-end gap-1 text-xs text-muted-foreground uppercase mb-1">
        {icon} {label}
      </div>
      <div className="text-lg text-primary font-bold">{total.toLocaleString()}</div>
      <div className="text-[10px] text-muted-foreground">{unique.toLocaleString()} unq</div>
    </div>
  );
}

export function RepoRowSkeleton() {
  return (
    <div className="bg-card border rounded-lg p-4 h-24 flex items-center gap-4">
      <Skeleton className="w-8 h-8" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-4 w-96" />
      </div>
    </div>
  );
}
