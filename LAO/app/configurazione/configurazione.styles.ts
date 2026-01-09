import { StyleSheet } from "react-native";
import { theme } from "@/lib/ui/theme";

export const s = StyleSheet.create({
    page: {
        flexGrow: 1,
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
        fontSize: 14,
        fontWeight: "700",
        marginTop: -6,
    },

    card: {
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.radius.lg,
        padding: 12,
        gap: 10,
        ...theme.shadow.card,
    },

    label: {
        color: theme.colors.muted,
        fontWeight: "900",
        marginTop: 6,
    },

    line: {
        color: theme.colors.text,
        fontWeight: "900",
    },

    input: {
        height: 44,
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.radius.md,
        paddingHorizontal: 12,
        color: theme.colors.text,
        fontWeight: "800",
    },

    inputDisabled: {
        opacity: 0.6,
    },

    pickerBox: {
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.radius.md,
        overflow: "hidden",
    },

    row: {
        flexDirection: "row",
        gap: 10,
        alignItems: "center",
    },

    btnPrimary: {
        flex: 1,
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
        flex: 1,
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

    warn: {
        color: theme.colors.muted,
        fontWeight: "900",
    },

    pieceCard: {
        backgroundColor: theme.colors.surface2,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.radius.lg,
        padding: 12,
        gap: 8,
    },
});
