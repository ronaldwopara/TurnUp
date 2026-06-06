import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { EventDetailModal, type EventDetail } from "@/components/EventDetailModal";
import { FlyerCard } from "@/components/FlyerCard";
import type { CommunityFlyer } from "@/lib/api-types";
import { ALL_EVENTS, ONBOARDING_HOME_UNIVERSITY_ID, UNIVERSITIES, formatPrice } from "@/lib/browse-data";
import { colors, radii, spacing } from "@/lib/theme";
import { useApi } from "@/lib/use-api";

export default function BrowseScreen() {
  const { requestJson } = useApi();
  const [communityFlyers, setCommunityFlyers] = useState<CommunityFlyer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<EventDetail | null>(null);

  const selectedUniversity = useMemo(() => {
    return UNIVERSITIES.find((u) => u.id === ONBOARDING_HOME_UNIVERSITY_ID) ?? UNIVERSITIES[0];
  }, []);

  const loadFlyers = useCallback(async () => {
    try {
      const flyers = await requestJson<CommunityFlyer[]>("/api/flyers", { method: "GET" });
      setCommunityFlyers(flyers);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load community flyers.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [requestJson]);

  useEffect(() => {
    void loadFlyers();
    const interval = setInterval(() => {
      void loadFlyers();
    }, 15000);
    return () => clearInterval(interval);
  }, [loadFlyers]);

  const onRefresh = () => {
    setRefreshing(true);
    void loadFlyers();
  };

  const openCatalogEvent = (event: (typeof ALL_EVENTS)[number]) => {
    setSelectedDetail({
      title: event.title,
      subtitle: event.date,
      description: event.description,
      location: event.location,
      priceLabel: formatPrice(event.priceUsd),
      sourceUrl: event.sourceUrl,
    });
  };

  const openFlyer = (flyer: CommunityFlyer) => {
    setSelectedDetail({
      title: flyer.title,
      subtitle: flyer.eventDate ?? flyer.price,
      description: flyer.description,
      priceLabel: flyer.price,
      sourceUrl: flyer.sourceUrl,
      calendarUrl: flyer.calendarUrl,
    });

    void requestJson(`/api/flyers/${flyer.id}/event`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "click" }),
    }).catch(() => undefined);
  };

  return (
    <View style={styles.container}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
        contentContainerStyle={styles.content}
      >
        <View style={styles.header}>
          <Text style={styles.heading}>Browse</Text>
          <View style={styles.uniChip}>
            <Text style={styles.uniChipText}>{selectedUniversity.abbr}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Trending near you</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
          {ALL_EVENTS.map((item) => (
            <Pressable
              key={item.id}
              style={[styles.catalogCard, { backgroundColor: item.color }]}
              onPress={() => openCatalogEvent(item)}
            >
              <Text style={styles.catalogTag}>{item.tag}</Text>
              <Text style={styles.catalogTitle}>{item.title}</Text>
              <Text style={[styles.catalogMeta, { color: item.accent }]}>{item.date}</Text>
              <Text style={styles.catalogPrice}>{formatPrice(item.priceUsd)}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Community flyers</Text>
          {loading ? <ActivityIndicator color={colors.accent} /> : null}
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.grid}>
          {communityFlyers.map((flyer) => (
            <FlyerCard key={flyer.id} flyer={flyer} onPress={() => openFlyer(flyer)} />
          ))}
        </View>

        {!loading && communityFlyers.length === 0 ? (
          <Text style={styles.empty}>No community flyers yet. Scan one from the Camera tab.</Text>
        ) : null}
      </ScrollView>

      <EventDetailModal
        visible={Boolean(selectedDetail)}
        event={selectedDetail}
        onClose={() => setSelectedDetail(null)}
      />
    </View>
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
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  heading: {
    color: colors.text,
    fontSize: 32,
    fontWeight: "800",
  },
  uniChip: {
    backgroundColor: colors.accentSoft,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
  },
  uniChipText: {
    color: colors.text,
    fontWeight: "700",
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  horizontalList: {
    gap: spacing.md,
    paddingRight: spacing.lg,
  },
  catalogCard: {
    width: 220,
    minHeight: 180,
    borderRadius: radii.lg,
    padding: spacing.lg,
    justifyContent: "space-between",
  },
  catalogTag: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  catalogTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "800",
  },
  catalogMeta: {
    fontSize: 14,
    fontWeight: "600",
  },
  catalogPrice: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "700",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  error: {
    color: colors.danger,
  },
  empty: {
    color: colors.textMuted,
    fontSize: 14,
  },
});
