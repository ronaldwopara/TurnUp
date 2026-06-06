import { Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { colors, radii, spacing } from "@/lib/theme";

export type EventDetail = {
  title: string;
  subtitle?: string;
  description?: string;
  location?: string;
  priceLabel?: string;
  sourceUrl?: string;
  calendarUrl?: string;
};

type EventDetailModalProps = {
  visible: boolean;
  event: EventDetail | null;
  onClose: () => void;
};

export function EventDetailModal({ visible, event, onClose }: EventDetailModalProps) {
  if (!event) {
    return null;
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{event.title}</Text>
          <Pressable onPress={onClose} hitSlop={12}>
            <Text style={styles.close}>Close</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {event.subtitle ? <Text style={styles.subtitle}>{event.subtitle}</Text> : null}
          {event.priceLabel ? <Text style={styles.chip}>{event.priceLabel}</Text> : null}
          {event.location ? <Text style={styles.body}>Location: {event.location}</Text> : null}
          {event.description ? <Text style={styles.body}>{event.description}</Text> : null}

          {event.sourceUrl ? (
            <Pressable style={styles.linkButton} onPress={() => void Linking.openURL(event.sourceUrl!)}>
              <Text style={styles.linkText}>Open source link</Text>
            </Pressable>
          ) : null}

          {event.calendarUrl ? (
            <Pressable style={styles.secondaryButton} onPress={() => void Linking.openURL(event.calendarUrl!)}>
              <Text style={styles.secondaryText}>Add to calendar</Text>
            </Pressable>
          ) : null}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  title: {
    flex: 1,
    color: colors.text,
    fontSize: 24,
    fontWeight: "700",
  },
  close: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: "600",
  },
  content: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 16,
  },
  chip: {
    alignSelf: "flex-start",
    color: colors.text,
    backgroundColor: colors.accentSoft,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    overflow: "hidden",
  },
  body: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 22,
  },
  linkButton: {
    marginTop: spacing.md,
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  linkText: {
    color: colors.text,
    fontWeight: "700",
    fontSize: 16,
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
});
