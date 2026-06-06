import { useAuth } from "@clerk/clerk-expo";
import { useCallback } from "react";

import { apiFetch, apiJson } from "@/lib/api-client";

export function useApi() {
  const { getToken, isLoaded, isSignedIn } = useAuth();

  const getAuthToken = useCallback(async () => {
    if (!isLoaded || !isSignedIn) {
      return null;
    }
    return getToken();
  }, [getToken, isLoaded, isSignedIn]);

  const request = useCallback(
    async (path: string, init?: RequestInit) => {
      const token = await getAuthToken();
      return apiFetch(path, init, token);
    },
    [getAuthToken]
  );

  const requestJson = useCallback(
    async <T>(path: string, init?: RequestInit) => {
      const token = await getAuthToken();
      return apiJson<T>(path, init, token);
    },
    [getAuthToken]
  );

  return {
    isLoaded,
    isSignedIn,
    request,
    requestJson,
    getAuthToken,
  };
}
