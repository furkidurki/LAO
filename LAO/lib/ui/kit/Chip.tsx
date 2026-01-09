import React from "react";
import { Pressable, Text, ViewStyle } from "react-native";
import { theme } from "@/lib/ui/theme";

type ChipTone = "neutral" | "primary" | "danger";

type Props = {
    label: string;
    onPress?: () => void;
    tone?: ChipTone;
    disabled?: boolean;
    style?: ViewStyle;
};

function getStyles(tone: ChipTone, disabled: boolean) {
    const baseBg = theme.colors.surface2;
    const baseBorder = theme.colors.border;
    const baseText = theme.colors.text;

    const primaryBg = theme.colors.primary;
    const primaryBorder = theme.colors.primary;
    const primaryText = "white";

    const dangerBg = "#D64545";
    const dangerBorder = "#D64545";
    const dangerText = "white";

    let bg = baseBg;
    let border = baseBorder;
    let text = baseText;

    if (tone === "primary") {
        bg = primaryBg;
        border = primaryBorder;
        text = primaryText;
    } else if (tone === "danger") {
        bg = dangerBg;
        border = dangerBorder;
        text = dangerText;
    }

    if (disabled) {
        bg = theme.colors.surface2;
        border = theme.colors.border;
        text = theme.colors.muted;
    }

    return { bg, border, text };
}

export function Chip({ label, onPress, tone = "neutral", disabled = false, style }: Props) {
    const isPressable = !!onPress && !disabled;
    const s = getStyles(tone, disabled);

    return (
        <Pressable
            onPress={onPress}
            disabled={!isPressable}
            hitSlop={10}
            style={({ pressed }) => [
                {
                    paddingVertical: 10,
                    paddingHorizontal: 14,
                    borderRadius: theme.radius.lg,
                    borderWidth: 1,
                    borderColor: s.border,
                    backgroundColor: s.bg,
                    opacity: pressed && isPressable ? 0.85 : 1,
                    transform: pressed && isPressable ? [{ scale: 0.98 }] : undefined,
                },
                style,
            ]}
            accessibilityRole="button"
        >
            <Text style={{ color: s.text, fontWeight: "900" }}>{label}</Text>
        </Pressable>
    );
}

