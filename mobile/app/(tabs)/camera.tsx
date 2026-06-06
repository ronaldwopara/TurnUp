import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import type { IngestEventPayload } from "@/lib/api-types";
import { toParsedEvent } from "@/lib/ingest";
import { colors, radii, spacing } from "@/lib/theme";
import { useApi } from "@/lib/use-api";

type ParsedEvent = NonNullable<ReturnType<typeof toParsedEvent>>;

export default function CameraScreen() {
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const { request, requestJson } = useApi();

  const [mode, setMode] = useState<"camera" | "link">("camera");
  const [busy, setBusy] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [linkValue, setLinkValue] = useState("");
  const [parsedEvent, setParsedEvent] = useState<ParsedEvent | null>(null);

  async function submitImageUri(uri: string, mimeType = "image/jpeg") {
    setBusy(true);
    setStatusMessage("Extracting text...");
    setParsedEvent(null);

    try {
      const formData = new FormData();
      formData.append("file", {
        uri,
        name: `turnup-${Date.now()}.jpg`,
        type: mimeType,
      } as unknown as Blob);
      formData.append("persistDeck", "true");

      const response = await request("/api/ingest/image", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Image ingest failed");
      }

      const payload = (await response.json()) as { data?: IngestEventPayload };
      const nextEvent = toParsedEvent(payload.data);
      setParsedEvent(nextEvent);
      setStatusMessage(nextEvent ? "" : "No flyer found");
    } catch {
      setStatusMessage("Could not parse image. Try another photo.");
      setParsedEvent(null);
    } finally {
      setBusy(false);
    }
  }

  async function onTakePhoto() {
    if (!cameraRef.current || busy) {
      return;
    }

    const photo = await cameraRef.current.takePictureAsync({ quality: 0.85 });
    if (!photo?.uri) {
      setStatusMessage("Photo capture failed. Please retry.");
      return;
    }

    await submitImageUri(photo.uri);
  }

  async function onPickImage() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.9,
    });

    if (result.canceled || !result.assets[0]?.uri) {
      return;
    }

    await submitImageUri(result.assets[0].uri, result.assets[0].mimeType ?? "image/jpeg");
  }

  async function onSubmitLink() {
    const url = linkValue.trim();
    if (!url || busy) {
      return;
    }

    setBusy(true);
    setStatusMessage("Extracting text...");
    setParsedEvent(null);

    try {
      const data = await requestJson<IngestEventPayload>("/api/ingest/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, persistDeck: true }),
      });

      const nextEvent = toParsedEvent(data);
      setParsedEvent(nextEvent);
      setStatusMessage(nextEvent ? "" : "No event found in link");
    } catch {
      setStatusMessage("Could not parse link. Try another URL.");
      setParsedEvent(null);
    } finally {
      setBusy(false);
    }
  }

  if (!permission) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.centered}>
        <Text style={styles.message}>TurnUp needs camera access to scan flyers.</Text>
        <Pressable style={styles.primaryButton} onPress={() => void requestPermission()}>
          <Text style={styles.primaryText}>Allow camera</Text>
        </Pressable>
        <Pressable style={styles.secondaryButton} onPress={() => void onPickImage()}>
          <Text style={styles.secondaryText}>Pick from library instead</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.modeRow}>
        <Pressable
          style={[styles.modeChip, mode === "camera" && styles.modeChipActive]}
          onPress={() => setMode("camera")}
        >
          <Text style={styles.modeChipText}>Camera</Text>
        </Pressable>
        <Pressable
          style={[styles.modeChip, mode === "link" && styles.modeChipActive]}
          onPress={() => setMode("link")}
        >
          <Text style={styles.modeChipText}>Link</Text>
        </Pressable>
      </View>

      {mode === "camera" ? (
        <View style={styles.cameraWrap}>
          <CameraView ref={cameraRef} style={styles.camera} facing="back" />
          <View style={styles.cameraActions}>
            <Pressable style={styles.primaryButton} disabled={busy} onPress={() => void onTakePhoto()}>
              <Text style={styles.primaryText}>{busy ? "Processing..." : "Capture flyer"}</Text>
            </Pressable>
            <Pressable style={styles.secondaryButton} disabled={busy} onPress={() => void onPickImage()}>
              <Text style={styles.secondaryText}>Upload photo</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <View style={styles.linkCard}>
          <TextInput
            value={linkValue}
            onChangeText={setLinkValue}
            placeholder="Paste Instagram, Eventbrite, or event link"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.input}
          />
          <Pressable style={styles.primaryButton} disabled={busy} onPress={() => void onSubmitLink()}>
            <Text style={styles.primaryText}>{busy ? "Processing..." : "Analyze link"}</Text>
          </Pressable>
        </View>
      )}

      {statusMessage ? <Text style={styles.status}>{statusMessage}</Text> : null}
      {busy ? <ActivityIndicator color={colors.accent} /> : null}

      {parsedEvent ? (
        <View style={styles.resultCard}>
          <Text style={styles.resultTitle}>{parsedEvent.title}</Text>
          {parsedEvent.date ? <Text style={styles.resultMeta}>{parsedEvent.date}</Text> : null}
          {parsedEvent.time ? <Text style={styles.resultMeta}>{parsedEvent.time}</Text> : null}
          {parsedEvent.location ? <Text style={styles.resultMeta}>{parsedEvent.location}</Text> : null}
          {parsedEvent.description ? <Text style={styles.resultBody}>{parsedEvent.description}</Text> : null}
          {parsedEvent.googleCalendarUrl ? (
            <Pressable
              style={styles.secondaryButton}
              onPress={() => void Linking.openURL(parsedEvent.googleCalendarUrl!)}
            >
              <Text style={styles.secondaryText}>Add to Google Calendar</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
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
  centered: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
    gap: spacing.md,
  },
  message: {
    color: colors.text,
    fontSize: 16,
    textAlign: "center",
  },
  modeRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  modeChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modeChipActive: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
  },
  modeChipText: {
    color: colors.text,
    fontWeight: "600",
  },
  cameraWrap: {
    gap: spacing.md,
  },
  camera: {
    width: "100%",
    aspectRatio: 3 / 4,
    borderRadius: radii.lg,
    overflow: "hidden",
  },
  cameraActions: {
    gap: spacing.sm,
  },
  linkCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  input: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  primaryButton: {
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  primaryText: {
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
    fontSize: 15,
  },
  status: {
    color: colors.textMuted,
    fontSize: 14,
  },
  resultCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  resultTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "800",
  },
  resultMeta: {
    color: colors.textMuted,
    fontSize: 15,
  },
  resultBody: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 22,
  },
});
