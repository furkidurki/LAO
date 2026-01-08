import type { ReactNode } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import { theme } from "@/lib/ui/theme";

type Props = {
    children: ReactNode;
    style?: StyleProp<ViewStyle>;
};

export function Card({ children, style }: Props) {
    return (
        <View
            style={[
                {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                    borderWidth: 1,
                    borderRadius: theme.radius.lg,
                    padding: theme.spacing.lg,
                    ...theme.shadow.card,
                },
                style,
            ]}
        >
            {children}
        </View>
    );
}
