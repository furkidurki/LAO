import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Platform, View } from "react-native";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { theme } from "@/lib/ui/theme";
import { MotionPressable } from "@/lib/ui/kit/MotionPressable";

function getIcon(routeName: string, focused: boolean) {
    const size = 24;
    const color = focused ? theme.colors.primary2 : "rgba(11,16,32,0.55)";

    switch (routeName) {
        case "index":
            return <Ionicons name={focused ? "home" : "home-outline"} size={size} color={color} />;
        case "ordini":
            return <Ionicons name={focused ? "document-text" : "document-text-outline"} size={size} color={color} />;
        case "configurazione":
            return <Ionicons name={focused ? "grid" : "grid-outline"} size={size} color={color} />;
        case "venduto":
            return <Ionicons name={focused ? "cash" : "cash-outline"} size={size} color={color} />;
        case "prestito":
            return <Ionicons name={focused ? "repeat" : "repeat-outline"} size={size} color={color} />;
        case "magazzino":
            return <Ionicons name={focused ? "cube" : "cube-outline"} size={size} color={color} />;
        case "settings":
            return <Ionicons name={focused ? "settings" : "settings-outline"} size={size} color={color} />;
        default:
            return <Ionicons name="ellipse-outline" size={size} color={color} />;
    }
}

export function FancyTabBar(props: BottomTabBarProps) {
    const { state, navigation } = props;
    const insets = useSafeAreaInsets();

    const routes = state.routes;
    const activeIndex = state.index;

    // dimensioni stile Instagram: piccola, centrata, non full width
    const BAR_MAX_W = 420;
    const BAR_SIDE_PAD = 10;

    const ITEM_W = 54; // larghezza tappabile
    const ITEM_H = 46;
    const GAP = 10;

    const IND_W = 44; // “pill” attiva dietro l’icona
    const IND_H = 44;

    const [outerW, setOuterW] = useState(0);

    const animX = useRef(new Animated.Value(0)).current;

    const barW = useMemo(() => {
        const totalNeeded = routes.length * ITEM_W + (routes.length - 1) * GAP + BAR_SIDE_PAD * 2;
        const maxByScreen = Math.max(0, outerW - 28); // margine schermo
        return Math.min(BAR_MAX_W, totalNeeded, maxByScreen);
    }, [routes.length, outerW]);

    const step = ITEM_W + GAP;

    useEffect(() => {
        // x inizia dalla sinistra (padding) e centra l’indicatore sul bottone
        const OFFSET_X = -19;
        const x = BAR_SIDE_PAD + activeIndex * step + (ITEM_W / 2 - IND_W / 2) + OFFSET_X;

        Animated.spring(animX, {
            toValue: x,
            useNativeDriver: true,
            speed: 20,
            bounciness: 0,
        }).start();
    }, [activeIndex, step, animX]);

    const bottomPad = Math.max(10, insets.bottom);
    const height = 58 + bottomPad;

    return (
        <View onLayout={(e) => setOuterW(e.nativeEvent.layout.width)} style={{ backgroundColor: "transparent" }}>
            <View
                style={{
                    height,
                    paddingBottom: bottomPad,
                    paddingTop: 8,
                    paddingHorizontal: 14,
                    backgroundColor: "transparent",
                    alignItems: "center",
                    justifyContent: "flex-end",
                }}
            >
                <View
                    style={{
                        width: barW,
                        height: 56,
                        borderRadius: 999,
                        backgroundColor: theme.colors.surface,
                        borderWidth: 1,
                        borderColor: theme.colors.border,
                        overflow: "hidden",
                        alignItems: "center",
                        justifyContent: "center",
                        ...(Platform.OS === "web"
                            ? ({ boxShadow: "0 10px 30px rgba(0,0,0,0.10)" } as any)
                            : theme.shadow.card),
                    }}
                >
                    {/* Active indicator (centrato sul bottone, stessa size sempre) */}
                    <Animated.View
                        pointerEvents="none"
                        style={{
                            position: "absolute",
                            top: (56 - IND_H) / 2,
                            left: 0,
                            width: IND_W,
                            height: IND_H,
                            borderRadius: 999,
                            backgroundColor: "rgba(0,183,194,0.14)",
                            borderWidth: 1,
                            borderColor: "rgba(0,183,194,0.22)",
                            transform: [{ translateX: animX }],
                        }}
                    />

                    {/* Icons row (non stretchata) */}
                    <View
                        style={{
                            height: 56,
                            paddingHorizontal: BAR_SIDE_PAD,
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "center",
                            columnGap: GAP,
                        }}
                    >
                        {routes.map((route, idx) => {
                            const focused = idx === activeIndex;

                            const onPress = () => {
                                const event = navigation.emit({
                                    type: "tabPress",
                                    target: route.key,
                                    canPreventDefault: true,
                                });

                                if (!focused && !event.defaultPrevented) {
                                    navigation.navigate(route.name);
                                }
                            };

                            const onLongPress = () => {
                                navigation.emit({
                                    type: "tabLongPress",
                                    target: route.key,
                                });
                            };

                            return (
                                <MotionPressable
                                    key={route.key}
                                    onPress={onPress}
                                    onLongPress={onLongPress}
                                    haptic="light"
                                    style={{
                                        width: ITEM_W,
                                        height: ITEM_H,
                                        alignItems: "center",
                                        justifyContent: "center",
                                    }}
                                >
                                    {getIcon(route.name, focused)}
                                </MotionPressable>
                            );
                        })}
                    </View>
                </View>
            </View>
        </View>
    );
}
