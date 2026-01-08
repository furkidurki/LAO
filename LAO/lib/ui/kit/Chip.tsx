import { Text, View, type StyleProp, type TextStyle, type ViewStyle } from "react-native";
import { theme } from "@/lib/ui/theme";
import { MotionPressable } from "@/lib/ui/kit/MotionPressable";

type Props = {
    label: string;
    onPress?: () => void;
    tone?: "neutral" | "primary";
    style?: StyleProp<ViewStyle>;
    textStyle?: StyleProp<TextStyle>;
};

export function Chip({ label, onPress, tone = "neutral", style, textStyle }: Props) {
    const base: ViewStyle = {
        paddingVertical: 9,
        paddingHorizontal: 12,
        borderRadius: theme.radius.pill,
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
    };

    const toneStyle: ViewStyle =
        tone === "primary"
            ? {
                backgroundColor: theme.colors.primary,
                borderWidth: 0,
                ...theme.shadow.press,
            }
            : {
                backgroundColor: theme.colors.surface,
                borderWidth: 1,
                borderColor: theme.colors.border,
            };

    const labelStyle: TextStyle = {
        color: tone === "primary" ? theme.colors.white : theme.colors.text,
        fontWeight: "900",
        fontSize: 13,
    };

    if (!onPress) {
        return (
            <View style={[base, toneStyle, style]}>
                <Text style={[labelStyle, textStyle]} numberOfLines={1}>
                    {label}
                </Text>
            </View>
        );
    }

    return (
        <MotionPressable onPress={onPress} haptic="light" style={[base, toneStyle, style]}>
            <Text style={[labelStyle, textStyle]} numberOfLines={1}>
                {label}
            </Text>
        </MotionPressable>
    );
}
