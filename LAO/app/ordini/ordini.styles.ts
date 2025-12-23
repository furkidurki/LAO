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
        flexGrow: 1,
        backgroundColor: C.bg,
        padding: 16,
        gap: 12,
    },

    title: {
        color: C.text,
        fontSize: 26,
        fontWeight: "900",
    },

    card: {
        backgroundColor: C.card,
        borderWidth: 1,
        borderColor: C.border,
        borderRadius: 16,
        padding: 14,
        gap: 10,
    },

    label: {
        color: C.muted,
        fontWeight: "900",
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

    inputDisabled: {
        opacity: 0.7,
    },

    pickerBox: {
        backgroundColor: C.card2,
        borderWidth: 1,
        borderColor: C.border,
        borderRadius: 14,
        overflow: "hidden",
    },

    row: {
        flexDirection: "row",
        gap: 10,
        flexWrap: "wrap",
        alignItems: "center",
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

    help: {
        color: C.muted,
        fontWeight: "800",
    },
});
