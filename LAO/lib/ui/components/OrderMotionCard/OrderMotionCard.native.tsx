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

    // On native we avoid nested Pressable conflicts.
    // If there is an action button, the card itself is not clickable.
    const cardPress = onPress && !action ? onPress : undefined;

    const accent = useMemo(() => getAccent(status, index), [status, index]);

    const scale = useRef(new Animated.Value(1)).current;

    function pressIn() {
        if (!cardPress) return;
        Animated.spring(scale, { toValue: 0.985, useNativeDriver: true, speed: 25, bounciness: 0 }).start();
    }
    function pressOut() {
        if (!cardPress) return;
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 25, bounciness: 0 }).start();
    }

    return (
        <Pressable disabled={!cardPress} onPress={cardPress} onPressIn={pressIn} onPressOut={pressOut}>
            <Animated.View style={[styles.cardOuter, { transform: [{ scale }] }]}>
                <View style={[styles.accentBar, { backgroundColor: accent }]} />

                <View style={styles.cardInner}>
                    <View style={styles.topRow}>
                        <View style={{ flex: 1, gap: 6 }}>
                            <Text style={styles.title} numberOfLines={1}>
                                {title}
                            </Text>
                            {meta ? (
                                <Text style={styles.meta} numberOfLines={2}>
                                    {meta}
                                </Text>
                            ) : null}
                        </View>

                        <View style={styles.badge}>
                            <Text style={styles.badgeText} numberOfLines={1}>
                                {badge.toUpperCase()}
                            </Text>
                        </View>
                    </View>

                    {lines?.length ? (
                        <View style={{ gap: 6 }}>
                            {lines.map((ln, i) => (
                                <Text key={`${ln.label}-${i}`} style={styles.lineMuted}>
                                    {ln.label} <Text style={styles.lineStrong}>{ln.value}</Text>
                                </Text>
                            ))}
                        </View>
                    ) : null}

                    {chips?.length ? (
                        <View style={styles.chipsWrap}>
                            {chips.map((c) => (
                                <View key={c} style={styles.chip}>
                                    <Text style={styles.chipText}>{c}</Text>
                                </View>
                            ))}
                        </View>
                    ) : null}

                    {action ? (
                        <View style={styles.actionRow}>
                            <Pressable onPress={action.onPress} style={styles.primaryBtn}>
                                <Text style={styles.primaryBtnText}>{action.label}</Text>
                            </Pressable>
                        </View>
                    ) : null}
                </View>
            </Animated.View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    cardOuter: {
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.radius.lg,
        overflow: "hidden",
        marginBottom: 14,
    },
    accentBar: {
        height: 4,
        width: "100%",
    },
    cardInner: {
        padding: 14,
        gap: 10,
    },
    topRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: 12,
    },
    title: {
        color: theme.colors.text,
        fontWeight: "900",
        fontSize: 16,
    },
    meta: {
        color: theme.colors.muted,
        fontWeight: "700",
    },
    badge: {
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: "rgba(255,255,255,0.06)",
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
        maxWidth: 140,
    },
    badgeText: {
        color: theme.colors.text,
        fontWeight: "900",
        fontSize: 12,
    },
    lineMuted: {
        color: theme.colors.muted,
        fontWeight: "700",
    },
    lineStrong: {
        color: theme.colors.text,
        fontWeight: "800",
    },
    chipsWrap: {
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
    actionRow: {
        flexDirection: "row",
        justifyContent: "flex-end",
    },
    primaryBtn: {
        backgroundColor: theme.colors.primary,
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 12,
    },
    primaryBtnText: {
        color: theme.colors.white,
        fontWeight: "900",
    },
});
