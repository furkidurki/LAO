import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Modal, Platform, Pressable, Text, TextInput, View } from "react-native";
import { CameraView, useCameraPermissions, BarcodeScanningResult } from "expo-camera";

type Props = {
    visible: boolean;
    onClose: () => void;
    onScanned: (value: string) => void;
    title?: string;
};

export function BarcodeScannerModal({ visible, onClose, onScanned, title }: Props) {
    const [permission, requestPermission] = useCameraPermissions();
    const [hasScanned, setHasScanned] = useState(false);
    const [manualValue, setManualValue] = useState("");

    useEffect(() => {
        if (!visible) {
            setHasScanned(false);
            setManualValue("");
        }
    }, [visible]);

    const handleScanned = useCallback(
        (res: BarcodeScanningResult) => {
            if (hasScanned) return;

            const raw = String(res?.data ?? "").trim();
            if (!raw) return;

            setHasScanned(true);

            setTimeout(() => {
                onScanned(raw);
                onClose();
            }, 50);
        },
        [hasScanned, onClose, onScanned]
    );

    const canAsk = permission?.canAskAgain ?? true;
    const granted = permission?.granted ?? false;

    // expo-camera web had some regressions around "facing" in the past.
    // To be defensive, on web we pass both props.
    const cameraFacingProps = useMemo(() => {
        if (Platform.OS === "web") return ({ facing: "back", type: "back" } as any);
        return { facing: "back" as const };
    }, []);

    return (
        <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
            <View style={{ flex: 1, backgroundColor: "#000" }}>
                <View style={{ paddingTop: Platform.OS === "ios" ? 54 : 18, paddingHorizontal: 16, paddingBottom: 12 }}>
                    <Text style={{ color: "#fff", fontSize: 18, fontWeight: "700" }}>
                        {title ?? "Scansiona barcode"}
                    </Text>
                    <Text style={{ color: "rgba(255,255,255,0.75)", marginTop: 6 }}>
                        Inquadra bene il codice. Appena lo legge, chiude da solo.
                    </Text>
                </View>

                {/* Permission state can be null on first render */}
                {permission == null ? (
                    <View style={{ flex: 1, padding: 16, justifyContent: "center" }}>
                        <Text style={{ color: "#fff", fontSize: 16, marginBottom: 12 }}>
                            Controllo permessi fotocamera…
                        </Text>

                        <Pressable
                            onPress={onClose}
                            style={{
                                backgroundColor: "rgba(255,255,255,0.12)",
                                paddingVertical: 12,
                                borderRadius: 10,
                                alignItems: "center",
                            }}
                        >
                            <Text style={{ color: "#fff", fontWeight: "700" }}>Chiudi</Text>
                        </Pressable>
                    </View>
                ) : !granted ? (
                    <View style={{ flex: 1, padding: 16, justifyContent: "center" }}>
                        <Text style={{ color: "#fff", fontSize: 16, marginBottom: 12 }}>
                            Serve il permesso fotocamera.
                        </Text>

                        <Pressable
                            onPress={async () => {
                                const r = await requestPermission();
                                if (!r?.granted && !canAsk) {
                                    Alert.alert("Permesso negato", "Abilita la fotocamera dalle impostazioni.");
                                }
                            }}
                            style={{
                                backgroundColor: "#2563eb",
                                paddingVertical: 12,
                                borderRadius: 10,
                                alignItems: "center",
                            }}
                        >
                            <Text style={{ color: "#fff", fontWeight: "700" }}>Dai permesso</Text>
                        </Pressable>

                        <Pressable
                            onPress={onClose}
                            style={{
                                marginTop: 12,
                                backgroundColor: "rgba(255,255,255,0.12)",
                                paddingVertical: 12,
                                borderRadius: 10,
                                alignItems: "center",
                            }}
                        >
                            <Text style={{ color: "#fff", fontWeight: "700" }}>Chiudi</Text>
                        </Pressable>
                    </View>
                ) : (
                    <View style={{ flex: 1 }}>
                        {/*
                          On web, barcode scanning support depends on the browser/device.
                          If it doesn't work, user can always paste the serial manually below.
                        */}
                        <CameraView
                            style={{ flex: 1 }}
                            {...cameraFacingProps}
                            onBarcodeScanned={handleScanned}
                            // If you want to limit formats:
                            // barcodeScannerSettings={{ barcodeTypes: ["ean13", "ean8", "code128", "code39", "qr"] }}
                        />

                        <View
                            pointerEvents="none"
                            style={{
                                position: "absolute",
                                left: 0,
                                right: 0,
                                top: "35%",
                                height: 220,
                                borderWidth: 2,
                                borderColor: "rgba(255,255,255,0.8)",
                                marginHorizontal: 24,
                                borderRadius: 14,
                            }}
                        />
                    </View>
                )}

                {/* Manual fallback (always available) */}
                {granted ? (
                    <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
                        <Text style={{ color: "rgba(255,255,255,0.75)", marginBottom: 8 }}>
                            Se lo scanner non prende, incolla qui il seriale.
                        </Text>

                        <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
                            <TextInput
                                value={manualValue}
                                onChangeText={setManualValue}
                                placeholder="Seriale"
                                placeholderTextColor="rgba(255,255,255,0.45)"
                                autoCapitalize="characters"
                                style={{
                                    flex: 1,
                                    height: 44,
                                    borderRadius: 10,
                                    borderWidth: 1,
                                    borderColor: "rgba(255,255,255,0.18)",
                                    paddingHorizontal: 12,
                                    color: "#fff",
                                    backgroundColor: "rgba(255,255,255,0.08)",
                                    fontWeight: "700",
                                }}
                            />

                            <Pressable
                                onPress={() => {
                                    const v = String(manualValue ?? "").trim();
                                    if (!v) return;
                                    onScanned(v);
                                    onClose();
                                }}
                                style={{
                                    height: 44,
                                    paddingHorizontal: 14,
                                    borderRadius: 10,
                                    alignItems: "center",
                                    justifyContent: "center",
                                    backgroundColor: "#2563eb",
                                }}
                            >
                                <Text style={{ color: "#fff", fontWeight: "800" }}>Usa</Text>
                            </Pressable>
                        </View>
                    </View>
                ) : null}

                <View style={{ padding: 16 }}>
                    <Pressable
                        onPress={onClose}
                        style={{
                            backgroundColor: "rgba(255,255,255,0.12)",
                            paddingVertical: 12,
                            borderRadius: 10,
                            alignItems: "center",
                        }}
                    >
                        <Text style={{ color: "#fff", fontWeight: "700" }}>Annulla</Text>
                    </Pressable>
                </View>
            </View>
        </Modal>
    );
}
