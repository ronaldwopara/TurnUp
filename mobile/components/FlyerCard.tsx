import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import type { CommunityFlyer } from "@/lib/api-types";
import { colors, radii, spacing } from "@/lib/theme";

type FlyerCardProps = {
  flyer: CommunityFlyer;
  onPress: () => void;
};

export function FlyerCard({ flyer, onPress }: FlyerCardProps) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, { opacity: pressed ? 0.92 : 1 }]}>
      <View style={[styles.poster, { backgroundColor: flyer.color }]}>
        {flyer.imageUrl ? (
          <Image source={{ uri: flyer.imageUrl }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={[styles.fallback, { borderColor: flyer.accent }]}>
            <Text style={[styles.fallbackText, { color: flyer.accent }]}>{flyer.title.slice(0, 1)}</Text>
          </View>
        )}
      </View>
      <View style={styles.meta}>
        <Text style={styles.title} numberOfLines={2}>
          {flyer.title}
        </Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          {flyer.eventDate ?? flyer.price ?? "Community flyer"}
        </Text>
        <Text style={styles.byline} numberOfLines={1}>
          by {flyer.postedBy}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: "46%",
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
  },
  poster: {
    aspectRatio: 0.72,
    width: "100%",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  fallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    margin: spacing.sm,
    borderRadius: radii.md,
  },
  fallbackText: {
    fontSize: 42,
    fontWeight: "700",
  },
  meta: {
    padding: spacing.md,
    gap: spacing.xs,
  },
  title: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "700",
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 13,
  },
  byline: {
    color: colors.textMuted,
    fontSize: 12,
  },
});
