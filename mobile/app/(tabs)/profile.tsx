import { useAuth, useUser } from "@clerk/clerk-expo";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { ApiHealthCheck } from "@/components/ApiHealthCheck";
import type { ProfileBundle, ProfileLearnedFact, ProfileStashItem } from "@/lib/api-types";
import { colors, radii, spacing } from "@/lib/theme";
import { useApi } from "@/lib/use-api";

export default function ProfileScreen() {
  const { signOut } = useAuth();
  const { user } = useUser();
  const { request, requestJson } = useApi();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stashes, setStashes] = useState<ProfileStashItem[]>([]);
  const [learnedFacts, setLearnedFacts] = useState<ProfileLearnedFact[]>([]);
  const [profileMeta, setProfileMeta] = useState<ProfileBundle["profile"]>();

  const loadProfile = useCallback(async () => {
    try {
      const bundle = await requestJson<ProfileBundle>("/api/profile", {
        method: "GET",
        cache: "no-store",
      });
      setStashes(bundle.stashes ?? []);
      setLearnedFacts(bundle.learnedFacts ?? []);
      setProfileMeta(bundle.profile);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load profile.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [requestJson]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const onRefresh = () => {
    setRefreshing(true);
    void loadProfile();
  };

  const onDeleteProfile = () => {
    Alert.alert("Delete profile data", "Delete your TurnUp profile data from the server?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          void (async () => {
            try {
              await request("/api/profile", { method: "DELETE" });
              await signOut();
            } catch (err) {
              Alert.alert("Delete failed", err instanceof Error ? err.message : "Could not delete profile.");
            }
          })();
        },
      },
    ]);
  };

  const displayName =
    profileMeta?.displayName ||
    user?.fullName ||
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    "TurnUp student";

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
    >
      <Text style={styles.heading}>Profile</Text>
      <Text style={styles.name}>{displayName}</Text>
      <Text style={styles.subtitle}>
        {profileMeta?.university || user?.primaryEmailAddress?.emailAddress || "Campus explorer"}
      </Text>

      <ApiHealthCheck />

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Stash</Text>
          {loading ? <ActivityIndicator color={colors.accent} /> : null}
        </View>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {stashes.length === 0 && !loading ? <Text style={styles.empty}>No saved stash items yet.</Text> : null}
        {stashes.map((item) => (
          <View key={item.id} style={styles.listItem}>
            <Text style={styles.itemTitle}>{item.title}</Text>
            <Text style={styles.itemMeta}>{item.type}{item.subtitle ? ` · ${item.subtitle}` : ""}</Text>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Learned insights</Text>
        {learnedFacts.length === 0 ? <Text style={styles.empty}>Insights appear as you save events and scans.</Text> : null}
        {learnedFacts.map((fact) => (
          <View key={fact.id} style={styles.insightChip}>
            <Text style={styles.insightText}>{fact.text}</Text>
          </View>
        ))}
      </View>

      <Pressable style={styles.secondaryButton} onPress={() => void signOut()}>
        <Text style={styles.secondaryText}>Sign out</Text>
      </Pressable>

      <Pressable style={styles.dangerButton} onPress={onDeleteProfile}>
        <Text style={styles.dangerText}>Delete profile data</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
    paddingBottom: spacing.xl,
  },
  heading: {
    color: colors.textMuted,
    fontSize: 14,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  name: {
    color: colors.text,
    fontSize: 30,
    fontWeight: "800",
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 15,
  },
  section: {
    gap: spacing.sm,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
  },
  listItem: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs,
  },
  itemTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "700",
  },
  itemMeta: {
    color: colors.textMuted,
    fontSize: 13,
  },
  insightChip: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    alignSelf: "flex-start",
  },
  insightText: {
    color: colors.text,
    fontSize: 14,
  },
  empty: {
    color: colors.textMuted,
    fontSize: 14,
  },
  error: {
    color: colors.danger,
    fontSize: 14,
  },
  secondaryButton: {
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryText: {
    color: colors.text,
    fontWeight: "600",
    fontSize: 16,
  },
  dangerButton: {
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    alignItems: "center",
    backgroundColor: "rgba(239,68,68,0.12)",
    borderWidth: 1,
    borderColor: colors.danger,
  },
  dangerText: {
    color: colors.danger,
    fontWeight: "700",
    fontSize: 16,
  },
});
