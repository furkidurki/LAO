import { StyleSheet } from "react-native";
import { theme } from "@/lib/ui/theme";

export const s = StyleSheet.create({
    root: { gap: 8 },

    label: {
        color: theme.colors.muted,
        fontWeight: "900",
    },

    trigger: {
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.radius.lg,
        paddingVertical: 12,
        paddingHorizontal: 12,
        ...theme.shadow.card,
    },

    triggerTextMuted: {
        color: theme.colors.muted,
        fontWeight: "900",
    },

    triggerText: {
        color: theme.colors.text,
        fontWeight: "900",
    },

    modalBackdrop: {
        flex: 1,
        backgroundColor: "rgba(11,16,32,0.35)",
        padding: 16,
        justifyContent: "flex-end",
    },

    backdropPress: {
        ...StyleSheet.absoluteFillObject,
    },

    sheet: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.radius.lg,
        borderWidth: 1,
        borderColor: theme.colors.border,
        padding: 12,
        maxHeight: "70%",
        ...theme.shadow.card,
    },

    search: {
        color: theme.colors.text,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.radius.md,
        padding: 10,
        marginBottom: 10,
        backgroundColor: theme.colors.surface2,
        fontWeight: "900",
    },

    option: {
        paddingVertical: 12,
        paddingHorizontal: 10,
        borderRadius: theme.radius.md,
        backgroundColor: "transparent",
    },

    optionSelected: {
        backgroundColor: "rgba(0,183,194,0.14)",
        borderWidth: 1,
        borderColor: "rgba(0,183,194,0.20)",
    },

    optionText: {
        color: theme.colors.text,
        fontWeight: "900",
    },

    sep: { height: 6 },
});
