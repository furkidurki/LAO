import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Platform, View, LayoutChangeEvent, useWindowDimensions } from "react-native";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

// Assicurati che il percorso import sia corretto per il tuo progetto
import { theme } from "@/lib/ui/theme";
import { MotionPressable } from "@/lib/ui/kit/MotionPressable";

// Configurazione Icone
function getIcon(routeName: string, focused: boolean) {
    const size = 22; // Ridotto leggermente per farci stare 7 icone su mobile
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
    const { width: windowWidth } = useWindowDimensions();

    const routes = state.routes;
    const activeIndex = state.index;

    // STATI
    const [layoutWidth, setLayoutWidth] = useState(windowWidth);
    const animX = useRef(new Animated.Value(0)).current;

    // BREAKPOINT: Consideriamo "Mobile" sotto i 600px
    const isMobile = layoutWidth < 600;

    // CONFIGURAZIONE RESPONSIVE
    // Mobile: Margini ridotti, niente gap tra icone per farne stare 7
    // Desktop: Margini larghi, gap estetico
    const MARGIN_H = isMobile ? 10 : 0;
    const GAP = isMobile ? 0 : 10;

    // Calcolo larghezza totale della barra
    const barTotalWidth = useMemo(() => {
        if (isMobile) {
            // Su mobile usa tutta la larghezza meno un piccolo margine laterale
            return layoutWidth - (MARGIN_H * 2);
        } else {
            // Su desktop usa una larghezza fissa o calcolata sui contenuti
            const desktopItemW = 54;
            const totalNeeded = routes.length * desktopItemW + (routes.length - 1) * GAP + 20; // 20 padding interno
            return Math.min(480, totalNeeded);
        }
    }, [isMobile, layoutWidth, routes.length, GAP, MARGIN_H]);

    // Calcolo larghezza del singolo Tab
    // Su mobile: divide lo spazio disponibile per il numero di icone
    // Su desktop: dimensione fissa o proporzionata
    const tabWidth = useMemo(() => {
        const paddingInsideBar = isMobile ? 0 : 20; // Padding interno al contenitore bianco
        const availableSpace = barTotalWidth - paddingInsideBar;

        if (isMobile) {
            return availableSpace / routes.length;
        } else {
            // Logica Desktop originale (approssimata per distribuire lo spazio rimanente o fissa)
            // Qui usiamo una logica flex: spazio diviso per n. rotte tenendo conto dei gap
            return (availableSpace - (routes.length - 1) * GAP) / routes.length;
        }
    }, [barTotalWidth, routes.length, isMobile, GAP]);

    // Dimensione dell'indicatore attivo
    const IND_W = isMobile ? tabWidth * 0.8 : 44;
    const IND_H = 44;

    // ANIMAZIONE
    useEffect(() => {
        let xPosition = 0;

        if (isMobile) {
            // Calcolo Mobile: Semplice moltiplicazione dell'indice
            xPosition = (activeIndex * tabWidth) + (tabWidth / 2 - IND_W / 2);
        } else {
            // Calcolo Desktop: Considera il padding iniziale e i gap
            const paddingLeft = 10; // Il padding orizzontale del container desktop
            xPosition = paddingLeft + (activeIndex * (tabWidth + GAP)) + (tabWidth / 2 - IND_W / 2);
        }

        Animated.spring(animX, {
            toValue: xPosition,
            useNativeDriver: true,
            speed: 18,
            bounciness: 2,
        }).start();
    }, [activeIndex, tabWidth, IND_W, isMobile, GAP, animX]);

    const bottomPad = Platform.OS === 'ios' ? Math.max(10, insets.bottom) : 10;
    const containerHeight = 60 + bottomPad;
    const barHeight = 56;

    return (
        <View
            style={{ width: '100%', backgroundColor: "transparent" }}
            onLayout={(e: LayoutChangeEvent) => setLayoutWidth(e.nativeEvent.layout.width)}
        >
            <View
                style={{
                    height: containerHeight,
                    paddingBottom: bottomPad,
                    paddingTop: 8,
                    alignItems: "center",
                    justifyContent: "flex-end",
                    // Su mobile vogliamo che tocchi quasi il fondo o abbia margine uniforme
                    paddingHorizontal: MARGIN_H,
                }}
            >
                <View
                    style={{
                        width: barTotalWidth,
                        height: barHeight,
                        borderRadius: 99, // Pillola arrotondata
                        backgroundColor: theme.colors.surface,
                        borderWidth: 1,
                        borderColor: theme.colors.border,
                        overflow: "hidden", // Importante per non far uscire l'indicatore
                        flexDirection: 'row', // Assicura layout orizzontale
                        alignItems: "center",
                        // Padding interno solo su desktop, su mobile usiamo tutto lo spazio
                        paddingHorizontal: isMobile ? 0 : 10,
                        ...(Platform.OS === "web"
                            ? ({ boxShadow: "0 4px 20px rgba(0,0,0,0.08)" } as any)
                            : theme.shadow.card),
                    }}
                >
                    {/* Active indicator (Sfondo che si muove) */}
                    <Animated.View
                        pointerEvents="none"
                        style={{
                            position: "absolute",
                            // Centrato verticalmente
                            top: (barHeight - IND_H) / 2,
                            left: 0,
                            width: IND_W,
                            height: IND_H,
                            borderRadius: 99,
                            backgroundColor: "rgba(0,183,194,0.14)", // Usa il tuo colore primario con opacità
                            borderWidth: 1,
                            borderColor: "rgba(0,183,194,0.22)",
                            transform: [{ translateX: animX }],
                        }}
                    />

                    {/* Icons row */}
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
                            <View
                                key={route.key}
                                style={{
                                    width: tabWidth,
                                    // Su desktop aggiungi margine destro tranne all'ultimo
                                    marginRight: (!isMobile && idx < routes.length - 1) ? GAP : 0,
                                    height: '100%',
                                    alignItems: "center",
                                    justifyContent: "center",
                                }}
                            >
                                <MotionPressable
                                    onPress={onPress}
                                    onLongPress={onLongPress}
                                    haptic="light"
                                    style={{
                                        width: '100%',
                                        height: '100%',
                                        alignItems: "center",
                                        justifyContent: "center",
                                    }}
                                >
                                    {getIcon(route.name, focused)}
                                </MotionPressable>
                            </View>
                        );
                    })}
                </View>
            </View>
        </View>
    );
}