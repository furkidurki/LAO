import type { ReactNode } from "react";
import { Platform, ScrollView, View, type StyleProp, type ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Pressable } from "react-native";
import { router, usePathname } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/lib/ui/theme";

type Props = {
    children: ReactNode;
    scroll?: boolean;
    style?: StyleProp<ViewStyle>;
    contentStyle?: StyleProp<ViewStyle>;
    hideBackgroundGlows?: boolean;
};

export function Screen({
                           children,
                           scroll = true,
                           style,
                           contentStyle,
                           hideBackgroundGlows,
                       }: Props) {
    const maxWidthStyle: ViewStyle =
        Platform.OS === "web"
            ? { width: "100%", maxWidth: 980, alignSelf: "center" }
            : { width: "100%" };
    const pathname = usePathname();
    const showHome = pathname !== "/";

    const baseContent: ViewStyle = {
        paddingHorizontal: theme.spacing.xl,
        paddingTop: theme.spacing.xl,
        paddingBottom: theme.spacing.xxl,
        gap: theme.spacing.lg,
    };

    const content = (
        <View style={[baseContent, !scroll ? { flex: 1 } : null, maxWidthStyle, contentStyle]}>
            {children}
        </View>
    );

    return (
        <SafeAreaView style={[{ flex: 1, backgroundColor: theme.colors.bg }, style]}>
            {showHome ? (
                <Pressable
                    onPress={() => router.replace("/")}
                    style={{
                        position: "absolute",
                        right: theme.spacing.md,
                        bottom: theme.spacing.md,
                        width: 44,
                        height: 44,
                        borderRadius: 999,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: theme.colors.surface2,
                        borderWidth: 1,
                        borderColor: theme.colors.border,
                        shadowColor: "#000",
                        shadowOpacity: 0.12,
                        shadowRadius: 10,
                        shadowOffset: { width: 0, height: 4 },
                        elevation: 6,
                        zIndex: 50,
                    }}
                    accessibilityRole="button"
                    accessibilityLabel="Home"
                >
                    <Ionicons name="home" size={22} color={theme.colors.text} />
                </Pressable>
            ) : null}
            {!hideBackgroundGlows ? (
                <>
                    <View
                        pointerEvents="none"
                        style={{
                            position: "absolute",
                            top: -120,
                            left: -160,
                            width: 340,
                            height: 340,
                            borderRadius: 340,
                            backgroundColor: theme.colors.glowTeal,
                        }}
                    />
                    <View
                        pointerEvents="none"
                        style={{
                            position: "absolute",
                            top: 120,
                            right: -180,
                            width: 380,
                            height: 380,
                            borderRadius: 380,
                            backgroundColor: theme.colors.glowBlue,
                        }}
                    />
                    <View
                        pointerEvents="none"
                        style={{
                            position: "absolute",
                            bottom: -220,
                            left: 40,
                            width: 420,
                            height: 420,
                            borderRadius: 420,
                            backgroundColor: theme.colors.glowYellow,
                        }}
                    />
                    <View
                        pointerEvents="none"
                        style={{
                            position: "absolute",
                            top: -120,
                            left: -120,
                            width: 520,
                            height: 140,
                            borderRadius: 24,
                            backgroundColor: "rgba(46,91,255,0.08)",
                            transform: [{ rotate: "-12deg" }],
                        }}
                    />
                </>
            ) : null}


            {scroll ? (
                <ScrollView
                    contentInsetAdjustmentBehavior="automatic"
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    {content}
                </ScrollView>
            ) : (
                content
            )}

        </SafeAreaView>
    );
}
