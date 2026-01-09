import React from "react";
import { ActivityIndicator, Pressable, Text, type StyleProp, type ViewStyle } from "react-native";
import { theme } from "@/lib/ui/theme";

type Props = {
    label: string;
    onPress: () => void;
    disabled?: boolean;
    loading?: boolean;
    tone?: "primary" | "neutral" | "danger";
    style?: StyleProp<ViewStyle>;
};

export function PrimaryButton({
                                  label,
                                  onPress,
                                  disabled = false,
                                  loading = false,
                                  tone = "primary",
                                  style,
                              }: Props) {
    const isDisabled = disabled || loading;

    const bg =
        tone === "primary"
            ? theme.colors.primary
            : tone === "danger"
                ? "#D64545"
                : theme.colors.surface2;

    const border =
        tone === "primary"
            ? theme.colors.primary
            : tone === "danger"
                ? "#D64545"
                : theme.colors.border;

    const textColor = tone === "neutral" ? theme.colors.text : "white";

    return (
        <Pressable
            onPress={onPress}
            disabled={isDisabled}
            hitSlop={12}
            style={({ pressed }) => [
                {
                    height: 46,
                    borderRadius: theme.radius.lg,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: bg,
                    borderWidth: 1,
                    borderColor: border,
                    opacity: isDisabled ? 0.6 : pressed ? 0.88 : 1,
                },
                style,
            ]}
            accessibilityRole="button"
        >
            {loading ? (
                <ActivityIndicator />
            ) : (
                <Text style={{ color: textColor, fontWeight: "900" }}>{label}</Text>
            )}
        </Pressable>
    );
}
