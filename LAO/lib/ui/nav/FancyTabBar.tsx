import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Platform, Text, View } from "react-native";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { theme } from "@/lib/ui/theme";
import { MotionPressable } from "@/lib/ui/kit/MotionPressable";

function getIcon(routeName: string, focused: boolean) {
    const size = 22;
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
    const { state, descriptors, navigation } = props;
    const insets = useSafeAreaInsets();

    const [barW, setBarW] = useState(0);
    const animX = useRef(new Animated.Value(0)).current;

    const routes = state.routes;
    const activeIndex = state.index;

    const itemW = barW > 0 ? barW / routes.length : 0;

    useEffect(() => {
        if (!itemW) return;
        Animated.spring(animX, {
            toValue: activeIndex * itemW,
            useNativeDriver: true,
            speed: 20,
            bounciness: 0,
        }).start();
    }, [activeIndex, itemW, animX]);

    const containerPadBottom = Math.max(10, insets.bottom);
    const height = 64 + containerPadBottom;

    const indicatorStyle = useMemo(() => {
        if (!itemW) return null;
        const pad = 10;
        const w = itemW - pad * 2;

        return {
            width: w,
            height: 44,
            borderRadius: 16,
            transform: [{ translateX: Animated.add(animX, new Animated.Value(pad)) }],
        } as const;
    }, [itemW, animX]);

    return (
        <View onLayout={(e) => setBarW(e.nativeEvent.layout.width)} style={{ backgroundColor: "transparent" }}>
            <View
                style={{
                    height,
                    paddingBottom: containerPadBottom,
                    paddingTop: 10,
                    paddingHorizontal: 14,
                    backgroundColor: "transparent",
                }}
            >
                <View
                    style={{
                        flex: 1,
                        borderRadius: 22,
                        backgroundColor: theme.colors.surface,
                        borderWidth: 1,
                        borderColor: theme.colors.border,
                        overflow: "hidden",
                        ...(Platform.OS === "web"
                            ? ({ boxShadow: "0 10px 30px rgba(0,0,0,0.08)" } as any)
                            : theme.shadow.card),
                    }}
                >
                    {indicatorStyle ? (
                        <Animated.View
                            pointerEvents="none"
                            style={[
                                {
                                    position: "absolute",
                                    top: 10,
                                    left: 0,
                                    backgroundColor: "rgba(0,183,194,0.14)",
                                    borderWidth: 1,
                                    borderColor: "rgba(0,183,194,0.22)",
                                },
                                indicatorStyle,
                            ]}
                        />
                    ) : null}

                    <View style={{ flex: 1, flexDirection: "row" }}>
                        {routes.map((route, idx) => {
                            const focused = idx === activeIndex;
                            const { options } = descriptors[route.key];

                            const label =
                                options.tabBarLabel !== undefined
                                    ? String(options.tabBarLabel)
                                    : options.title !== undefined
                                        ? String(options.title)
                                        : route.name;

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
                                <View key={route.key} style={{ flex: 1 }}>
                                    <MotionPressable
                                        onPress={onPress}
                                        onLongPress={onLongPress}
                                        haptic="light"
                                        style={{
                                            height: "100%",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            gap: 6,
                                        }}
                                    >
                                        {getIcon(route.name, focused)}

                                        <Text
                                            numberOfLines={1}
                                            style={{
                                                fontSize: 11,
                                                fontWeight: "900",
                                                color: focused ? theme.colors.primary2 : "rgba(11,16,32,0.55)",
                                                letterSpacing: -0.1,
                                            }}
                                        >
                                            {label}
                                        </Text>
                                    </MotionPressable>
                                </View>
                            );
                        })}
                    </View>
                </View>
            </View>
        </View>
    );
}
