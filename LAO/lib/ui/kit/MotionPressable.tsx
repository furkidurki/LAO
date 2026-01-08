import type { ReactNode } from "react";
import { useMemo, useRef } from "react";
import {
    Animated,
    Pressable,
    type GestureResponderEvent,
    type PressableProps,
    type StyleProp,
    type ViewStyle,
} from "react-native";
import * as Haptics from "expo-haptics";

type Props = Omit<PressableProps, "style" | "children"> & {
    children: ReactNode;
    style?: StyleProp<ViewStyle>;
    pressedStyle?: StyleProp<ViewStyle>;
    haptic?: "light" | "medium" | "none";
};

export function MotionPressable({
                                    children,
                                    style,
                                    pressedStyle,
                                    haptic = "light",
                                    onPress,
                                    onPressIn,
                                    onPressOut,
                                    ...rest
                                }: Props) {
    const scale = useRef(new Animated.Value(1)).current;
    const opacity = useRef(new Animated.Value(1)).current;

    const animatedStyle = useMemo(
        () => ({
            opacity,
            transform: [{ scale }],
        }),
        [opacity, scale]
    );

    const handlePressIn: PressableProps["onPressIn"] = (e: GestureResponderEvent) => {
        Animated.spring(scale, {
            toValue: 0.985,
            useNativeDriver: true,
            speed: 24,
            bounciness: 0,
        }).start();

        Animated.timing(opacity, {
            toValue: 0.96,
            duration: 90,
            useNativeDriver: true,
        }).start();

        onPressIn?.(e);
    };

    const handlePressOut: PressableProps["onPressOut"] = (e: GestureResponderEvent) => {
        Animated.spring(scale, {
            toValue: 1,
            useNativeDriver: true,
            speed: 18,
            bounciness: 6,
        }).start();

        Animated.timing(opacity, {
            toValue: 1,
            duration: 120,
            useNativeDriver: true,
        }).start();

        onPressOut?.(e);
    };

    const handlePress: PressableProps["onPress"] = (e: GestureResponderEvent) => {
        if (haptic !== "none") {
            const style =
                haptic === "medium"
                    ? Haptics.ImpactFeedbackStyle.Medium
                    : Haptics.ImpactFeedbackStyle.Light;
            Haptics.impactAsync(style).catch(() => {});
        }
        onPress?.(e);
    };

    return (
        <Pressable
            {...rest}
            onPress={handlePress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
        >
            <Animated.View style={[animatedStyle, style, pressedStyle]}>{children}</Animated.View>
        </Pressable>
    );
}
