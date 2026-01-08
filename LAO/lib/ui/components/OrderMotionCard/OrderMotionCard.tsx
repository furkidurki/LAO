import React, { useMemo, useRef } from "react";
import { View, Text, Pressable, StyleSheet, Animated } from "react-native";

import { theme } from "@/lib/ui/theme";
import type { OrderMotionCardProps } from "./OrderMotionCard.types";

function getAccent(status: string | undefined, index: number) {
    const s = (status ?? "").toLowerCase();
    if (s.includes("ordinato")) return theme.colors.primary;
    if (s.includes("arrivato")) return "#22C55E";
    if (s.includes("venduto")) return "#F59E0B";
    if (s.includes("prestito")) return "#A855F7";

    const palette = [theme.colors.primary, "#22C55E", "#F59E0B", "#A855F7"];
    return palette[index % palette.length];
}

export function OrderMotionCard(props: OrderMotionCardProps) {
    const { index, title, badge, status, meta, lines, chips, action, onPress } = props;

    // If there is an action button, card itself is not clickable (avoids double press).
    const cardPress = onPress && !action ? onPress : undefined;

    const accent = useMemo(() => getAccent(status, index), [status, index]);

    const scale = useRef(new Animated.Value(1)).current;

    function pressIn() {
        if (!cardPress) return;
        Animated.spring(scale, { toValue: 0.99, useNativeDriver: true, speed: 25, bounciness: 0 }).start();
    }
    function pressOut() {
        if (!cardPress) return;
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 25, bounciness: 0 }).start();
    }

    const lineSummary = useMemo(() => {
        if (!lines?.length) return "";
        return lines
            .map((l) => {
                const lbl = l.label.endsWith(":") ? l.label.slice(0, -1) : l.label;
                return `${lbl}: ${l.value}`;
            })
            .join(" • ");
    }, [lines]);

    return (
        <Pressable disabled={!cardPress} onPress={cardPress} onPressIn={pressIn} onPressOut={pressOut}>
            <Animated.View style={[styles.outer, { transform: [{ scale }] }]}>
                <View style={[styles.accent, { backgroundColor: accent }]} />
                <View style={styles.paper}>
                    <View style={styles.row}>
                        <View style={styles.left}>
                            <Text style={styles.title} numberOfLines={1}>
                                {title}
                            </Text>

                            {(meta || lineSummary) ? (
                                <Text style={styles.sub} numberOfLines={1}>
                                    {meta ? meta : ""}
                                    {meta && lineSummary ? " • " : ""}
                                    {lineSummary ? lineSummary : ""}
                                </Text>
                            ) : null}

                            {chips?.length ? (
                                <View style={styles.chipsRow}>
                                    {chips.map((c) => (
                                        <View key={c} style={styles.chip}>
                                            <Text style={styles.chipText}>{c}</Text>
                                        </View>
                                    ))}
                                </View>
                            ) : null}
                        </View>

                        <View style={styles.right}>
                            <View style={styles.badge}>
                                <Text style={styles.badgeText} numberOfLines={1}>
                                    {badge.toUpperCase()}
                                </Text>
                            </View>

                            {action ? (
                                <Pressable onPress={action.onPress} style={styles.btn}>
                                    <Text style={styles.btnText}>{action.label}</Text>
                                </Pressable>
                            ) : null}
                        </View>
                    </View>
                </View>
            </Animated.View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    outer: {
        borderRadius: 18,
        overflow: "hidden",
        marginBottom: 10,
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.surface,
    },
    accent: {
        height: 4,
        width: "100%",
    },
    paper: {
        padding: 12,
        minHeight: 86,
    },
    row: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
    },
    left: {
        flex: 1,
        minWidth: 0,
        gap: 8,
    },
    right: {
        alignItems: "flex-end",
        gap: 10,
        flexShrink: 0,
    },
    title: {
        color: theme.colors.text,
        fontWeight: "900",
        fontSize: 16,
    },
    sub: {
        color: theme.colors.muted,
        fontWeight: "700",
        fontSize: 13,
    },
    chipsRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
    },
    chip: {
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: "rgba(255,255,255,0.05)",
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
    },
    chipText: {
        color: theme.colors.text,
        fontWeight: "900",
        fontSize: 12,
    },
    badge: {
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: "rgba(255,255,255,0.06)",
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
        maxWidth: 150,
    },
    badgeText: {
        color: theme.colors.text,
        fontWeight: "900",
        fontSize: 12,
    },
    btn: {
        backgroundColor: theme.colors.primary,
        paddingVertical: 9,
        paddingHorizontal: 12,
        borderRadius: 12,
    },
    btnText: {
        color: theme.colors.white,
        fontWeight: "900",
    },
});
