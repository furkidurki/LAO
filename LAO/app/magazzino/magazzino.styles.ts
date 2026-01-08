import { StyleSheet } from "react-native";
import { theme } from "@/lib/ui/theme";

export const s = StyleSheet.create({
    page: {
        flex: 1,
        backgroundColor: theme.colors.bg,
        padding: 16,
        gap: 12,
    },

    title: {
        color: theme.colors.text,
        fontSize: 26,
        fontWeight: "900",
    },

    subtitle: {
        color: theme.colors.muted,
        fontWeight: "900",
        marginTop: -6,
    },

    card: {
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.radius.lg,
        padding: 14,
        gap: 10,
        ...theme.shadow.card,
    },

    lineMuted: {
        color: theme.colors.muted,
        fontWeight: "900",
    },
    lineStrong: {
        color: theme.colors.text,
        fontWeight: "900",
    },

    row: {
        flexDirection: "row",
        gap: 10,
        flexWrap: "wrap",
        alignItems: "center",
    },

    input: {
        backgroundColor: theme.colors.surface2,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.radius.lg,
        paddingVertical: 12,
        paddingHorizontal: 12,
        color: theme.colors.text,
        fontWeight: "900",
    },

    inputDisabled: { opacity: 0.7 },

    pickerBox: {
        backgroundColor: theme.colors.surface2,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.radius.lg,
        overflow: "hidden",
    },

    btnPrimary: {
        backgroundColor: theme.colors.primary2,
        paddingVertical: 12,
        paddingHorizontal: 12,
        borderRadius: theme.radius.md,
        alignItems: "center",
        ...theme.shadow.press,
    },
    btnPrimaryText: {
        color: theme.colors.white,
        fontWeight: "900",
    },

    btnMuted: {
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        paddingVertical: 12,
        paddingHorizontal: 12,
        borderRadius: theme.radius.md,
        alignItems: "center",
    },
    btnMutedText: {
        color: theme.colors.text,
        fontWeight: "900",
    },

    empty: {
        color: theme.colors.muted,
        fontWeight: "900",
    },

    listContent: { paddingTop: 10, paddingBottom: 40 },
});
