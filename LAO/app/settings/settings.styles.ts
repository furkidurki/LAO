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
        ...theme.shadow.card,
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

    btnDanger: {
        backgroundColor: theme.colors.danger,
        paddingVertical: 12,
        paddingHorizontal: 12,
        borderRadius: theme.radius.md,
        alignItems: "center",
        ...theme.shadow.press,
    },
    btnDangerText: {
        color: theme.colors.white,
        fontWeight: "900",
    },

    listItem: {
        backgroundColor: theme.colors.surface2,
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
        backgroundColor: theme.colors.surface,
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
        fontWeight: "900",
    },

    sep: { height: 10 },
});
