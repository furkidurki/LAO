import { Text, type StyleProp, type TextStyle, type ViewStyle } from "react-native";
import { theme } from "@/lib/ui/theme";
import { MotionPressable } from "@/lib/ui/kit/MotionPressable";

type Variant = "primary" | "secondary" | "danger";

type Props = {
    title: string;
    onPress: () => void;
    variant?: Variant;
    style?: StyleProp<ViewStyle>;
    textStyle?: StyleProp<TextStyle>;
    disabled?: boolean;
};

export function Button({ title, onPress, variant = "primary", style, textStyle, disabled }: Props) {
    const base: ViewStyle = {
        borderRadius: theme.radius.md,
        paddingVertical: 12,
        paddingHorizontal: 14,
        alignItems: "center",
        justifyContent: "center",
    };

    const variants: Record<Variant, ViewStyle> = {
        primary: {
            backgroundColor: theme.colors.primary,
            ...theme.shadow.press,
        },
        secondary: {
            backgroundColor: "rgba(255,255,255,0.06)",
            borderWidth: 1,
            borderColor: theme.colors.border,
        },
        danger: {
            backgroundColor: theme.colors.danger,
            ...theme.shadow.press,
        },
    };

    const label: TextStyle = {
        color: variant === "secondary" ? theme.colors.text : theme.colors.white,
        fontWeight: "900",
        fontSize: 14,
    };

    return (
        <MotionPressable
            onPress={onPress}
            disabled={disabled}
            haptic={disabled ? "none" : "light"}
            style={[base, variants[variant], disabled ? { opacity: 0.5 } : null, style]}
        >
            <Text style={[label, textStyle]}>{title}</Text>
        </MotionPressable>
    );
}
