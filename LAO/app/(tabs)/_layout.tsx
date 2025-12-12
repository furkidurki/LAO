import { Tabs } from "expo-router";

export default function TabsLayout() {
    return (
        <Tabs>
            <Tabs.Screen
                name="index"
                options={{ title: "Home" }}
            />
            <Tabs.Screen
                name="magazzino"
                options={{ title: "Magazzino" }}
            />
        </Tabs>
    );
}
