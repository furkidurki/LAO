import { View, Text, Pressable } from "react-native";
import { router } from "expo-router";


export default function SettingsScreen() {
    return (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <Text>Settings</Text>
            <Pressable onPress={() => router.push("/settings/editDistributori")}>
                <Text>distributori</Text>
            </Pressable>
        </View>

    );
}
