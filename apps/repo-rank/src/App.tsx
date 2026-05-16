import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Switch, Route, Router } from "wouter";
import Dashboard from "./pages/dashboard";
import NotFound from "./pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 5 * 60 * 1000, refetchOnWindowFocus: false },
  },
});

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router base={basePath}>
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route component={NotFound} />
        </Switch>
      </Router>
    </QueryClientProvider>
  );
}
