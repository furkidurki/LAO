import React, { useMemo, useRef } from "react";
import { View, Text, Pressable, StyleSheet, Animated } from "react-native";

import { theme } from "@/lib/ui/theme";
import type { OrderMotionCardProps } from "./OrderMotionCard.types";

function getAccent(status: string | undefined, index: number) {
    const s = (status ?? "").toLowerCase();
    if (s.includes("ordinato")) return theme.colors.primary;
    if (s.includes("arrivato")) return theme.colors.success;
    if (s.includes("venduto")) return theme.colors.warning;
    if (s.includes("prestito")) return theme.colors.primary2;

    const palette = [theme.colors.primary, theme.colors.primary2, theme.colors.warning, theme.colors.success];
    return palette[index % palette.length];
}

export function OrderMotionCard(props: OrderMotionCardProps) {
    const { index, title, badge, status, meta, lines, chips, action, onPress } = props;

    const cardPress = onPress && !action ? onPress : undefined;
    const accent = useMemo(() => getAccent(status, index), [status, index]);

    const scale = useRef(new Animated.Value(1)).current;

    function pressIn() {
        if (!cardPress) return;
        Animated.spring(scale, { toValue: 0.988, useNativeDriver: true, speed: 22, bounciness: 0 }).start();
    }
    function pressOut() {
        if (!cardPress) return;
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 22, bounciness: 0 }).start();
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
        ...theme.shadow.card,
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
        fontWeight: "900",
    },
    badge: {
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.surface2,
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
        fontWeight: "900",
    },
    lineStrong: {
        color: theme.colors.text,
        fontWeight: "900",
    },
    chipsWrap: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
    },
    chip: {
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.surface2,
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
        backgroundColor: theme.colors.primary2,
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 12,
        ...theme.shadow.press,
    },
    primaryBtnText: {
        color: theme.colors.white,
        fontWeight: "900",
    },
});
