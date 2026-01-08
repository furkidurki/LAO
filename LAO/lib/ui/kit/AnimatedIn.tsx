import { useEffect, useRef, type ReactNode } from "react";
import { Animated, Easing, type ViewStyle } from "react-native";

type Props = {
    children: ReactNode;
    delayMs?: number;
    fromY?: number;
    style?: ViewStyle | ViewStyle[];
};

export function AnimatedIn({ children, delayMs = 0, fromY = 12, style }: Props) {
    const progress = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        progress.setValue(0);
        Animated.sequence([
            Animated.delay(delayMs),
            Animated.timing(progress, {
                toValue: 1,
                duration: 420,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
            }),
        ]).start();
    }, [delayMs, progress]);

    const translateY = progress.interpolate({
        inputRange: [0, 1],
        outputRange: [fromY, 0],
    });

    return (
        <Animated.View
            style={[
                {
                    opacity: progress,
                    transform: [{ translateY }],
                },
                style,
            ]}
        >
            {children}
        </Animated.View>
    );
}
