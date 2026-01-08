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
        marginTop: -6,
    },
    empty: {
        color: theme.colors.muted,
        fontWeight: "900",
    },
    listContent: {
        paddingTop: 10,
        paddingBottom: 90, // più spazio per tabbar nuova
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
    cardTitle: {
        color: theme.colors.text,
        fontWeight: "900",
        fontSize: 16,
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
    rowBetween: {
        flexDirection: "row",
        justifyContent: "space-between",
        gap: 10,
        alignItems: "center",
        flexWrap: "wrap",
    },

    btnPrimary: {
        backgroundColor: theme.colors.primary2,
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: theme.radius.md,
        ...theme.shadow.press,
    },
    btnPrimaryText: {
        color: theme.colors.white,
        fontWeight: "900",
    },
    btnMuted: {
        backgroundColor: theme.colors.surface2,
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
        ...theme.shadow.press,
    },
    btnDangerText: {
        color: theme.colors.white,
        fontWeight: "900",
    },

    input: {
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.radius.lg,
        paddingVertical: 12,
        paddingHorizontal: 12,
        color: theme.colors.text,
        fontWeight: "900",
    },

    badge: {
        borderWidth: 1,
        borderColor: "rgba(0,183,194,0.25)",
        backgroundColor: "rgba(0,183,194,0.12)",
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 999,
    },
    badgeText: {
        color: theme.colors.text,
        fontWeight: "900",
    },

    grid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 12,
    },
    statCard: {
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.radius.lg,
        padding: 14,
        width: "48%",
        gap: 6,
        ...theme.shadow.card,
    },
    statValue: {
        color: theme.colors.text,
        fontWeight: "900",
        fontSize: 20,
    },
    statLabel: {
        color: theme.colors.muted,
        fontWeight: "900",
    },
    sectionTitle: {
        color: theme.colors.text,
        fontWeight: "900",
        fontSize: 16,
        marginTop: 6,
    },

    groupCard: {
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.radius.lg,
        padding: 14,
        marginBottom: 12,
        gap: 10,
        ...theme.shadow.card,
    },
    groupTitle: {
        color: theme.colors.text,
        fontWeight: "900",
        fontSize: 16,
        flexShrink: 1,
    },
    block: {
        marginTop: 10,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
        gap: 8,
    },
    blockTitle: {
        color: theme.colors.text,
        fontWeight: "900",
    },
    pieceRow: {
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.radius.lg,
        padding: 12,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
        backgroundColor: theme.colors.surface2,
    },
    pieceLeft: { flex: 1, gap: 4 },
    serial: { color: theme.colors.text, fontWeight: "900" },
    smallMuted: { color: theme.colors.muted, fontWeight: "900" },
    miniBtn: {
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: theme.radius.md,
    },
    miniBtnText: { color: theme.colors.text, fontWeight: "900" },

    sectionCard: {
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.radius.lg,
        padding: 14,
        gap: 10,
        ...theme.shadow.card,
    },
    rowBtn: {
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.radius.lg,
        paddingVertical: 12,
        paddingHorizontal: 12,
    },
    rowTop: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 10,
    },
    rowTitle: {
        color: theme.colors.text,
        fontWeight: "900",
        fontSize: 16,
        flex: 1,
    },
    rowChevron: {
        color: theme.colors.muted,
        fontWeight: "900",
        fontSize: 18,
    },
    rowSubtitle: {
        color: theme.colors.muted,
        fontWeight: "900",
        marginTop: 6,
    },
    logoutBtn: {
        backgroundColor: theme.colors.danger,
        borderRadius: theme.radius.lg,
        paddingVertical: 12,
        paddingHorizontal: 12,
        alignItems: "center",
        ...theme.shadow.press,
    },
    logoutText: {
        color: theme.colors.white,
        fontWeight: "900",
        fontSize: 16,
    },
});
