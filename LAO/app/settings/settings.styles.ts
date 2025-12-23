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
        fontWeight: "800",
        marginTop: -6,
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
        fontWeight: "800",
    },

    btnPrimary: {
        backgroundColor: theme.colors.primary,
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: theme.radius.md,
    },
    btnPrimaryText: {
        color: theme.colors.white,
        fontWeight: "900",
    },

    btnMuted: {
        backgroundColor: "rgba(255,255,255,0.08)",
        borderWidth: 1,
        borderColor: theme.colors.border,
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: theme.radius.md,
    },
    btnMutedText: {
        color: theme.colors.text,
        fontWeight: "900",
    },

    btnDanger: {
        backgroundColor: theme.colors.danger,
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: theme.radius.md,
    },
    btnDangerText: {
        color: theme.colors.white,
        fontWeight: "900",
    },

    listItem: {
        backgroundColor: "rgba(255,255,255,0.04)",
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
        fontWeight: "800",
    },

    checkBtn: {
        backgroundColor: "rgba(255,255,255,0.08)",
        borderWidth: 1,
        borderColor: theme.colors.border,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: theme.radius.md,
    },

    checkText: {
        color: theme.colors.text,
        fontWeight: "900",
    },

    empty: {
        color: theme.colors.muted,
        fontWeight: "800",
    },

    sep: { height: 10 },
});
