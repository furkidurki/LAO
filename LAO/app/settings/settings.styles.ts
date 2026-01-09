// app/settings/settings.styles.ts
import { StyleSheet } from "react-native";
import { theme } from "@/lib/ui/theme";

export const s = StyleSheet.create({
    page: {
        flex: 1,
        backgroundColor: theme.colors.bg,
        padding: 16,
        gap: 10,
    },

    title: {
        color: theme.colors.text,
        fontSize: 28,
        fontWeight: "900",
        letterSpacing: -0.2,
    },

    subtitle: {
        color: theme.colors.muted,
        fontWeight: "900",
        marginTop: 2,
    },

    card: {
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.radius.lg,
        padding: 12,
    },

    row: {
        flexDirection: "row",
        gap: 10,
        flexWrap: "wrap",
        alignItems: "center",
    },

    input: {
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.radius.md,
        paddingHorizontal: 12,
        paddingVertical: 10,
        color: theme.colors.text,
        backgroundColor: theme.colors.surface2,
        fontWeight: "900",
    },

    // Buttons
    btnPrimary: {
        backgroundColor: theme.colors.primary,
        borderRadius: theme.radius.md,
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    btnPrimaryText: {
        color: "#fff",
        fontWeight: "900",
    },

    btnMuted: {
        backgroundColor: theme.colors.surface2,
        borderRadius: theme.radius.md,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    btnMutedText: {
        color: theme.colors.text,
        fontWeight: "900",
    },

    btnDanger: {
        backgroundColor: theme.colors.danger,
        borderRadius: theme.radius.md,
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    btnDangerText: {
        color: "#fff",
        fontWeight: "900",
    },

    // --- LIST STYLES (new names) ---
    listItem: {
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.radius.md,
        paddingHorizontal: 12,
        paddingVertical: 12,
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        marginBottom: 10,
    },

    itemLeft: {
        flex: 1,
        gap: 2,
    },

    itemTitle: {
        color: theme.colors.text,
        fontWeight: "900",
        fontSize: 16,
    },

    itemMuted: {
        color: theme.colors.muted,
        fontWeight: "900",
    },

    // --- LIST STYLES (aliases for old code) ---
    itemRow: {
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.radius.md,
        paddingHorizontal: 12,
        paddingVertical: 12,
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        marginBottom: 10,
    },

    itemRowClickable: {
        // keep empty - only for conditional merge in arrays
    },

    itemMeta: {
        color: theme.colors.muted,
        fontWeight: "900",
        marginTop: 2,
    },

    // Empty
    empty: {
        padding: 16,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.radius.md,
        backgroundColor: theme.colors.surface,
    },
    emptyText: {
        color: theme.colors.muted,
        fontWeight: "900",
    },

    // Checkbox button
    checkBtn: {
        width: 34,
        height: 34,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.surface2,
        alignItems: "center",
        justifyContent: "center",
    },

    sep: {
        height: 1,
        backgroundColor: theme.colors.border,
        marginVertical: 10,
    },
});
