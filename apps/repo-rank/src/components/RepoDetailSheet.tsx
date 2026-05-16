import {
  useGetRepoTrafficDetail,
  getGetRepoTrafficDetailQueryKey,
  type RepoTrafficDetail,
  type RepoTrafficDetailTopReferrersItem,
  type RepoTrafficDetailTopPathsItem,
} from "@repo-ranker/api-client-react";

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { TrafficChart } from "@/components/TrafficChart";

interface Props {
  owner: string;
  repo: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RepoDetailSheet({ owner, repo, open, onOpenChange }: Props) {
  const { data, isLoading, isError } = useGetRepoTrafficDetail(owner, repo, {
    query: {
      queryKey: getGetRepoTrafficDetailQueryKey(owner, repo),
      enabled: open && Boolean(owner) && Boolean(repo),
    },
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto sm:w-[540px] bg-card border-l-border">
        <SheetHeader className="mb-6">
          <SheetTitle className="text-2xl font-bold flex items-center gap-2">
            <span className="text-primary">{owner}</span> / {repo}
          </SheetTitle>
        </SheetHeader>

        {isLoading ? (
          <DetailSkeleton />
        ) : isError || !data ? (
          <div className="text-center text-muted-foreground p-8 border rounded-lg border-dashed">
            Failed to load repository details.
          </div>
        ) : (
          <DetailBody data={data} />
        )}
      </SheetContent>
    </Sheet>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-8">
      <Skeleton className="h-[200px] w-full rounded-lg" />
      <Skeleton className="h-[200px] w-full rounded-lg" />
      <Skeleton className="h-[200px] w-full rounded-lg" />
    </div>
  );
}

function DetailBody({ data }: { data: RepoTrafficDetail }) {
  return (
    <div className="space-y-8 pb-12">
      <ChartSection title="14-Day Views" total={data.repo.views.total}>
        <TrafficChart
          data={data.viewsSeries}
          primaryStroke="hsl(var(--primary))"
          gradientId="colorViews"
        />
      </ChartSection>

      <ChartSection title="14-Day Clones" total={data.repo.clones.total}>
        <TrafficChart
          data={data.clonesSeries}
          primaryStroke="hsl(var(--chart-3))"
          gradientId="colorClones"
        />
      </ChartSection>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ListSection title="Top Referrers" emptyText="No referrers" items={data.topReferrers}>
          {(ref) => (
            <Row
              key={ref.referrer}
              primary={<span className="font-medium truncate pr-2">{ref.referrer}</span>}
              count={ref.count}
              uniques={ref.uniques}
            />
          )}
        </ListSection>

        <ListSection title="Popular Paths" emptyText="No path data" items={data.topPaths}>
          {(path) => (
            <Row
              key={path.path}
              primary={
                <div className="truncate pr-2 min-w-0">
                  <div className="font-medium truncate" title={path.title}>
                    {path.title || path.path}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">{path.path}</div>
                </div>
              }
              count={path.count}
              uniques={path.uniques}
            />
          )}
        </ListSection>
      </div>
    </div>
  );
}

function ChartSection({
  title,
  total,
  children,
}: {
  title: string;
  total: number;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <h3 className="font-mono text-sm uppercase text-muted-foreground tracking-wider flex justify-between">
        <span>{title}</span>
        <span className="text-primary">{total.toLocaleString()} total</span>
      </h3>
      {children}
    </div>
  );
}

type ListItem = RepoTrafficDetailTopReferrersItem | RepoTrafficDetailTopPathsItem;

function ListSection<T extends ListItem>({
  title,
  emptyText,
  items,
  children,
}: {
  title: string;
  emptyText: string;
  items: T[];
  children: (item: T) => React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <h3 className="font-mono text-sm uppercase text-muted-foreground tracking-wider">{title}</h3>
      <div className="bg-background/50 rounded-lg border divide-y overflow-hidden">
        {items.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">{emptyText}</div>
        ) : (
          items.slice(0, 5).map(children)
        )}
      </div>
    </div>
  );
}

function Row({
  primary,
  count,
  uniques,
}: {
  primary: React.ReactNode;
  count: number;
  uniques: number;
}) {
  return (
    <div className="p-3 flex justify-between items-center text-sm">
      {primary}
      <div className="font-mono text-right shrink-0">
        <div className="text-primary">{count}</div>
        <div className="text-[10px] text-muted-foreground">{uniques} unq</div>
      </div>
    </div>
  );
}
