import { StyleSheet } from "react-native";

const C = {
    bg: "#0b1220",
    card: "rgba(255,255,255,0.06)",
    card2: "rgba(255,255,255,0.04)",
    border: "rgba(255,255,255,0.12)",
    text: "#E5E7EB",
    muted: "rgba(229,231,235,0.70)",
    primary: "#3B82F6",
    danger: "#EF4444",
    white: "#ffffff",
};

export const s = StyleSheet.create({
    page: {
        flex: 1,
        backgroundColor: C.bg,
        padding: 16,
        gap: 14,
    },

    title: {
        color: C.text,
        fontSize: 26,
        fontWeight: "900",
    },

    subtitle: {
        color: C.muted,
        fontWeight: "800",
        marginTop: -8,
    },

    card: {
        backgroundColor: C.card,
        borderWidth: 1,
        borderColor: C.border,
        borderRadius: 16,
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
        backgroundColor: C.card2,
        borderWidth: 1,
        borderColor: C.border,
        borderRadius: 14,
        paddingVertical: 12,
        paddingHorizontal: 12,
        color: C.text,
        fontWeight: "800",
    },

    btnPrimary: {
        backgroundColor: C.primary,
        paddingVertical: 12,
        paddingHorizontal: 12,
        borderRadius: 14,
        alignItems: "center",
    },
    btnPrimaryText: {
        color: C.white,
        fontWeight: "900",
    },

    btnMuted: {
        backgroundColor: "rgba(255,255,255,0.08)",
        borderWidth: 1,
        borderColor: C.border,
        paddingVertical: 12,
        paddingHorizontal: 12,
        borderRadius: 14,
        alignItems: "center",
    },
    btnMutedText: {
        color: C.text,
        fontWeight: "900",
    },

    btnDanger: {
        backgroundColor: C.danger,
        paddingVertical: 12,
        paddingHorizontal: 12,
        borderRadius: 14,
        alignItems: "center",
    },
    btnDangerText: {
        color: C.white,
        fontWeight: "900",
    },

    listItem: {
        backgroundColor: C.card2,
        borderWidth: 1,
        borderColor: C.border,
        borderRadius: 16,
        padding: 12,
        flexDirection: "row",
        gap: 10,
        alignItems: "center",
        justifyContent: "space-between",
    },

    itemLeft: { flex: 1, gap: 4 },

    itemTitle: {
        color: C.text,
        fontWeight: "900",
    },

    itemMuted: {
        color: C.muted,
        fontWeight: "800",
    },

    checkBtn: {
        backgroundColor: "rgba(255,255,255,0.08)",
        borderWidth: 1,
        borderColor: C.border,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 12,
    },

    checkText: {
        color: C.text,
        fontWeight: "900",
    },

    empty: {
        color: C.muted,
        fontWeight: "800",
    },

    sep: { height: 10 },
});
