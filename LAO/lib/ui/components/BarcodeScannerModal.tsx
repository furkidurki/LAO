import React, { useCallback, useEffect, useState } from "react";
import { Alert, Modal, Platform, Pressable, Text, View } from "react-native";
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

    useEffect(() => {
        if (!visible) setHasScanned(false);
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

                {!granted ? (
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
                        <CameraView
                            style={{ flex: 1 }}
                            facing="back"
                            onBarcodeScanned={handleScanned}
                            // Se vuoi limitare i formati:
                            // barcodeScannerSettings={{ barcodeTypes: ["ean13", "code128", "qr"] }}
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
