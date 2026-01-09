import { Alert, Platform } from "react-native";

/**
 * Conferma cross-platform.
 * - Web: window.confirm (affidabile)
 * - iOS/Android: Alert.alert con bottoni
 */
export function confirmDanger(title: string, message: string): Promise<boolean> {
    if (Platform.OS === "web") {
        try {
            return Promise.resolve(window.confirm(`${title}\n\n${message}`));
        } catch {
            return Promise.resolve(false);
        }
    }

    return new Promise((resolve) => {
        Alert.alert(title, message, [
            { text: "Annulla", style: "cancel", onPress: () => resolve(false) },
            { text: "Conferma", style: "destructive", onPress: () => resolve(true) },
        ]);
    });
}
