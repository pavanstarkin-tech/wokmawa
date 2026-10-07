import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient();

  let basepath: string | undefined = undefined;
  if (typeof window !== "undefined") {
    const pathname = window.location.pathname;
    if (pathname.startsWith("/wokmawa-admin")) {
      basepath = "/wokmawa-admin";
    } else if (pathname.startsWith("/wokmawa")) {
      basepath = "/wokmawa";
    }
  }

  const router = createRouter({
    routeTree,
    basepath,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
