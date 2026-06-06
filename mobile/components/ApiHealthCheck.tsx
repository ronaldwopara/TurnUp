import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { smokeTestApi } from "@/lib/api-client";
import { useApi } from "@/lib/use-api";
import { colors, radii, spacing } from "@/lib/theme";

type ApiHealthState = "idle" | "loading" | "ok" | "error";

export function ApiHealthCheck() {
  const { isLoaded, isSignedIn, getAuthToken } = useApi();
  const [state, setState] = useState<ApiHealthState>("idle");
  const [message, setMessage] = useState("Waiting for auth...");

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!isLoaded) {
        return;
      }

      if (!isSignedIn) {
        setState("idle");
        setMessage("Sign in to verify API connectivity.");
        return;
      }

      setState("loading");
      setMessage("Checking /api/flyers and /api/profile...");

      try {
        const token = await getAuthToken();
        const result = await smokeTestApi(token);
        if (cancelled) return;

        if (result.flyersOk && result.profileOk) {
          setState("ok");
          setMessage("API smoke test passed.");
        } else {
          setState("error");
          setMessage("API responded, but one endpoint returned an unexpected shape.");
        }
      } catch (error) {
        if (cancelled) return;
        setState("error");
        setMessage(error instanceof Error ? error.message : "API smoke test failed.");
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [getAuthToken, isLoaded, isSignedIn]);

  return (
    <View style={[styles.card, state === "ok" && styles.ok, state === "error" && styles.error]}>
      <Text style={styles.label}>Backend connectivity</Text>
      {state === "loading" ? <ActivityIndicator color={colors.accent} /> : null}
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  ok: {
    borderColor: colors.success,
  },
  error: {
    borderColor: colors.danger,
  },
  label: {
    color: colors.textMuted,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  message: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
});
