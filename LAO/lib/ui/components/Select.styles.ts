import { StyleSheet } from "react-native";
import { theme } from "@/lib/ui/theme";

export const s = StyleSheet.create({
    root: { gap: 8 },

    label: {
        color: theme.colors.muted,
        fontWeight: "800",
    },

    trigger: {
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.radius.lg,
        paddingVertical: 12,
        paddingHorizontal: 12,
    },

    triggerTextMuted: {
        color: theme.colors.muted,
        fontWeight: "800",
    },

    triggerText: {
        color: theme.colors.text,
        fontWeight: "800",
    },

    modalBackdrop: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.55)",
        padding: 16,
        justifyContent: "flex-end",
    },

    // pressable separata (chiude solo se tocchi FUORI dal foglio)
    backdropPress: {
        ...StyleSheet.absoluteFillObject,
    },

    sheet: {
        backgroundColor: theme.colors.surface2,
        borderRadius: theme.radius.lg,
        borderWidth: 1,
        borderColor: theme.colors.border,
        padding: 12,
        maxHeight: "70%",
    },

    search: {
        color: theme.colors.text,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.radius.md,
        padding: 10,
        marginBottom: 10,
        backgroundColor: theme.colors.surface,
    },

    option: {
        paddingVertical: 12,
        paddingHorizontal: 10,
        borderRadius: theme.radius.md,
    },

    optionSelected: {
        backgroundColor: "rgba(59,130,246,0.18)",
    },

    optionText: {
        color: theme.colors.text,
        fontWeight: "800",
    },

    sep: { height: 6 },
});
