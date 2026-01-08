import type { ReactNode } from "react";
import { Text, View, type StyleProp, type ViewStyle } from "react-native";
import { theme } from "@/lib/ui/theme";

type Props = {
    title: string;
    right?: ReactNode;
    style?: StyleProp<ViewStyle>;
};

export function SectionHeader({ title, right, style }: Props) {
    return (
        <View
            style={[
                {
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: theme.spacing.md,
                    marginTop: theme.spacing.sm,
                },
                style,
            ]}
        >
            <Text
                style={{
                    color: theme.colors.text,
                    fontSize: theme.typography.h2.fontSize,
                    fontWeight: theme.typography.h2.fontWeight,
                    letterSpacing: theme.typography.h2.letterSpacing,
                }}
            >
                {title}
            </Text>
            {right}
        </View>
    );
}
