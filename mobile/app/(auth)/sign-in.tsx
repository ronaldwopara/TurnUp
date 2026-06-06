import { useSignIn, useSignUp } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { getApiBaseUrl } from "@/lib/api-client";
import { colors, radii, spacing } from "@/lib/theme";

export default function SignInScreen() {
  const router = useRouter();
  const { isLoaded: signInLoaded, signIn, setActive: setSignInActive } = useSignIn();
  const { isLoaded: signUpLoaded, signUp, setActive: setSignUpActive } = useSignUp();

  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pendingVerification, setPendingVerification] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const isLoaded = signInLoaded && signUpLoaded;

  async function onSubmit() {
    if (!isLoaded || busy) {
      return;
    }

    setBusy(true);
    setError(null);

    try {
      if (mode === "sign-in") {
        const result = await signIn.create({
          identifier: email.trim(),
          password,
        });

        if (result.status === "complete" && result.createdSessionId) {
          await setSignInActive({ session: result.createdSessionId });
          router.replace("/(tabs)/browse");
          return;
        }

        setError("Sign in requires an additional step in Clerk.");
        return;
      }

      await signUp.create({
        emailAddress: email.trim(),
        password,
      });

      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setPendingVerification(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Authentication failed.";
      setError(message);
    } finally {
      setBusy(false);
    }
  }

  async function onVerifyEmail() {
    if (!isLoaded || busy || !signUp) {
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const result = await signUp.attemptEmailAddressVerification({
        code: verificationCode.trim(),
      });

      if (result.status === "complete" && result.createdSessionId) {
        await setSignUpActive({ session: result.createdSessionId });
        router.replace("/(tabs)/browse");
        return;
      }

      setError("Verification could not be completed.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Verification failed.";
      setError(message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.hero}>
        <Text style={styles.brand}>TurnUp</Text>
        <Text style={styles.subtitle}>Events for students, by students.</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>{mode === "sign-in" ? "Sign in" : "Create account"}</Text>
        <Text style={styles.hint}>Using the same Clerk app as the web client.</Text>

        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          placeholder="Email"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
          value={email}
          onChangeText={setEmail}
        />

        {!pendingVerification ? (
          <TextInput
            secureTextEntry
            placeholder="Password"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            value={password}
            onChangeText={setPassword}
          />
        ) : (
          <TextInput
            autoCapitalize="none"
            placeholder="Verification code"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            value={verificationCode}
            onChangeText={setVerificationCode}
          />
        )}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          style={[styles.primaryButton, busy && styles.disabled]}
          disabled={busy || !isLoaded}
          onPress={() => void (pendingVerification ? onVerifyEmail() : onSubmit())}
        >
          {busy ? (
            <ActivityIndicator color={colors.text} />
          ) : (
            <Text style={styles.primaryText}>
              {pendingVerification ? "Verify email" : mode === "sign-in" ? "Sign in" : "Create account"}
            </Text>
          )}
        </Pressable>

        {!pendingVerification ? (
          <Pressable onPress={() => setMode(mode === "sign-in" ? "sign-up" : "sign-in")}>
            <Text style={styles.switchText}>
              {mode === "sign-in" ? "Need an account? Sign up" : "Already have an account? Sign in"}
            </Text>
          </Pressable>
        ) : (
          <Pressable onPress={() => setPendingVerification(false)}>
            <Text style={styles.switchText}>Back to sign up</Text>
          </Pressable>
        )}
      </View>

      <Text style={styles.apiHint}>API base: {getApiBaseUrl()}</Text>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
    justifyContent: "center",
    gap: spacing.lg,
  },
  hero: {
    alignItems: "center",
    gap: spacing.sm,
  },
  brand: {
    color: colors.text,
    fontSize: 40,
    fontWeight: "800",
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 16,
    textAlign: "center",
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "700",
  },
  hint: {
    color: colors.textMuted,
    fontSize: 14,
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
  error: {
    color: colors.danger,
    fontSize: 14,
  },
  primaryButton: {
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  disabled: {
    opacity: 0.7,
  },
  primaryText: {
    color: colors.text,
    fontWeight: "700",
    fontSize: 16,
  },
  switchText: {
    color: colors.accent,
    textAlign: "center",
    fontSize: 14,
  },
  apiHint: {
    color: colors.textMuted,
    fontSize: 12,
    textAlign: "center",
  },
});
