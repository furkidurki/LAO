import { StyleSheet } from "react-native";
import { theme } from "@/lib/ui/theme";

export const s = StyleSheet.create({
    page: {
        flex: 1,
        backgroundColor: theme.colors.bg,
        padding: 16,
        gap: 14,
    },

    title: {
        color: theme.colors.text,
        fontSize: 26,
        fontWeight: "900",
    },

    subtitle: {
        color: theme.colors.muted,
        fontWeight: "900",
        marginTop: -8,
    },

    card: {
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.radius.lg,
        padding: 14,
        gap: 12,
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

    btnPrimary: {
        backgroundColor: theme.colors.primary,
        paddingVertical: 12,
        paddingHorizontal: 12,
        borderRadius: theme.radius.md,
        alignItems: "center",
    },
    btnPrimaryText: {
        color: theme.colors.white,
        fontWeight: "900",
    },

    btnMuted: {
        backgroundColor: theme.colors.surface2,
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

    btnDanger: {
        backgroundColor: theme.colors.danger,
        paddingVertical: 12,
        paddingHorizontal: 12,
        borderRadius: theme.radius.md,
        alignItems: "center",
    },
    btnDangerText: {
        color: theme.colors.white,
        fontWeight: "900",
    },

    listItem: {
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.radius.lg,
        padding: 12,
        flexDirection: "row",
        gap: 10,
        alignItems: "center",
        justifyContent: "space-between",
    },

    itemLeft: { flex: 1, gap: 4 },

    itemTitle: {
        color: theme.colors.text,
        fontWeight: "900",
    },

    itemMuted: {
        color: theme.colors.muted,
        fontWeight: "900",
    },

    checkBtn: {
        width: 44,
        height: 40,
        borderRadius: 14,
        backgroundColor: theme.colors.surface2,
        borderWidth: 1,
        borderColor: theme.colors.border,
        alignItems: "center",
        justifyContent: "center",
    },

    empty: {
        color: theme.colors.muted,
        fontWeight: "900",
    },

    sep: { height: 10 },
});
