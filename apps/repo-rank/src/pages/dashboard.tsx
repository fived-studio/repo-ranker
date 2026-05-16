import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AlertCircle, RefreshCw } from "lucide-react";
import {
  useListRepoTraffic,
  getListRepoTrafficQueryKey,
  type GitHubUser,
  type RepoTrafficListTotals,
} from "@repo-ranker/api-client-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RepoDetailSheet } from "@/components/RepoDetailSheet";
import { RepoRow, RepoRowSkeleton } from "@/components/RepoRow";

const SORT_FIELDS = ["views", "clones", "stars", "forks", "pushedAt"] as const;
type SortField = (typeof SORT_FIELDS)[number];

const SORT_LABEL: Record<SortField, string> = {
  views: "Sort by Views",
  clones: "Sort by Clones",
  stars: "Sort by Stars",
  forks: "Sort by Forks",
  pushedAt: "Sort by Activity",
};

function isSortField(value: string): value is SortField {
  return (SORT_FIELDS as readonly string[]).includes(value);
}

function errorMessage(error: unknown): string | null {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return null;
}

export default function Dashboard() {
  const queryClient = useQueryClient();
  const { data, isLoading, isError, error, isRefetching } = useListRepoTraffic({
    query: { queryKey: getListRepoTrafficQueryKey() },
  });

  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("views");
  const [showForks, setShowForks] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [hideZeroTraffic, setHideZeroTraffic] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState<string | null>(null);

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: getListRepoTrafficQueryKey() });
  };

  const processedRepos = useMemo(() => {
    if (!data?.repos) return [];
    const needle = search.trim().toLowerCase();

    return data.repos
      .filter((repo) => {
        if (!showForks && repo.isFork) return false;
        if (!showArchived && repo.isArchived) return false;
        if (hideZeroTraffic && repo.views.total === 0 && repo.clones.total === 0) return false;
        if (needle && !repo.name.toLowerCase().includes(needle)) return false;
        return true;
      })
      .sort((a, b) => {
        switch (sortField) {
          case "views":
            return b.views.total - a.views.total;
          case "clones":
            return b.clones.total - a.clones.total;
          case "stars":
            return b.stars - a.stars;
          case "forks":
            return b.forks - a.forks;
          case "pushedAt": {
            const aTime = a.pushedAt ? new Date(a.pushedAt).getTime() : 0;
            const bTime = b.pushedAt ? new Date(b.pushedAt).getTime() : 0;
            return bTime - aTime;
          }
        }
      });
  }, [data?.repos, search, sortField, showForks, showArchived, hideZeroTraffic]);

  if (isError) {
    const message = errorMessage(error);
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-card border rounded-lg p-6 text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
          <h2 className="text-xl font-bold">Failed to load traffic data</h2>
          <p className="text-muted-foreground text-sm">
            Please check your GitHub token scope or rate limits.
            {message && (
              <span className="block mt-2 font-mono text-xs p-2 bg-muted rounded">
                {message}
              </span>
            )}
          </p>
          <Button onClick={handleRefresh}>Try Again</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur border-b">
        <header className="border-b border-border/50">
          <div className="container max-w-6xl mx-auto px-4 py-4 md:py-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <UserHeader user={data?.user} isLoading={isLoading} />
              <TotalsPanel totals={data?.totals} isLoading={isLoading} />
            </div>
          </div>
        </header>

        <div className="container max-w-6xl mx-auto px-4 py-3">
          <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center bg-card/70 p-3 rounded-lg border">
            <Input
              placeholder="Filter repositories..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-md font-mono"
            />

            <div className="flex flex-wrap items-center gap-4 md:gap-6">
              <ToggleSwitch id="forks" label="Forks" checked={showForks} onChange={setShowForks} />
              <ToggleSwitch id="archived" label="Archived" checked={showArchived} onChange={setShowArchived} />
              <ToggleSwitch id="zerotraffic" label="Hide 0 Traffic" checked={hideZeroTraffic} onChange={setHideZeroTraffic} />

              <Select
                value={sortField}
                onValueChange={(value) => {
                  if (isSortField(value)) setSortField(value);
                }}
              >
                <SelectTrigger className="w-[140px] font-mono text-xs">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  {SORT_FIELDS.map((field) => (
                    <SelectItem key={field} value={field}>
                      {SORT_LABEL[field]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="icon"
                onClick={handleRefresh}
                disabled={isRefetching || isLoading}
                aria-label="Refresh"
              >
                <RefreshCw className={`w-4 h-4 ${isRefetching ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <main className="container max-w-6xl mx-auto px-4 py-6 space-y-6">
        <div className="space-y-2">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => <RepoRowSkeleton key={i} />)
          ) : processedRepos.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground bg-card border rounded-lg border-dashed">
              No repositories match your criteria.
            </div>
          ) : (
            processedRepos.map((repo, idx) => (
              <RepoRow
                key={repo.id}
                repo={repo}
                rank={idx + 1}
                onSelect={() => setSelectedRepo(repo.name)}
              />
            ))
          )}
        </div>
      </main>

      {selectedRepo && data?.user.login && (
        <RepoDetailSheet
          owner={data.user.login}
          repo={selectedRepo}
          open
          onOpenChange={(open) => !open && setSelectedRepo(null)}
        />
      )}
    </div>
  );
}

function ToggleSwitch({
  id,
  label,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center space-x-2">
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
      <Label htmlFor={id} className="text-xs uppercase font-mono">
        {label}
      </Label>
    </div>
  );
}

function UserHeader({ user, isLoading }: { user: GitHubUser | undefined; isLoading: boolean }) {
  return (
    <div className="flex items-center gap-4">
      {isLoading || !user ? (
        <Skeleton className="w-12 h-12 rounded-full" />
      ) : (
        <img
          src={user.avatarUrl}
          alt={`${user.login} avatar`}
          className="w-12 h-12 rounded-full border border-primary/30"
        />
      )}
      <div>
        <h1 className="text-xl font-bold tracking-tight">
          {isLoading || !user ? <Skeleton className="w-32 h-6" /> : user.login}
        </h1>
        <p className="text-sm text-muted-foreground flex gap-3">
          {isLoading || !user ? (
            <Skeleton className="w-48 h-4 mt-1" />
          ) : (
            <>
              <span>{user.publicRepos} Repos</span>
              <span>{user.followers} Followers</span>
            </>
          )}
        </p>
      </div>
    </div>
  );
}

function TotalsPanel({
  totals,
  isLoading,
}: {
  totals: RepoTrafficListTotals | undefined;
  isLoading: boolean;
}) {
  return (
    <div className="flex items-center gap-4 text-sm font-mono bg-muted/50 p-3 rounded-md border">
      {isLoading || !totals ? (
        <div className="flex gap-6">
          <Skeleton className="w-16 h-8" />
          <Skeleton className="w-16 h-8" />
        </div>
      ) : (
        <>
          <Stat label="14D Views" value={totals.views.total.toLocaleString()} highlight />
          <Stat label="14D Clones" value={totals.clones.total.toLocaleString()} highlight />
          <Stat label="Repos" value={totals.repoCount.toString()} />
        </>
      )}
    </div>
  );
}

function Stat({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="text-center">
      <div className="text-muted-foreground uppercase text-[10px]">{label}</div>
      <div className={`text-lg ${highlight ? "text-primary" : ""}`}>{value}</div>
    </div>
  );
}
