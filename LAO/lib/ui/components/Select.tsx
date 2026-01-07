import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, FlatList, Modal, Pressable, Text, TextInput, View } from "react-native";
import { s } from "./Select.styles";

export type SelectOption = { label: string; value: string };

export function Select(props: {
    label?: string;
    placeholder?: string;
    value: string | null;
    options: SelectOption[];
    onChange: (value: string) => void;
    searchable?: boolean;
}) {
    const { label, placeholder = "Seleziona...", value, options, onChange, searchable } = props;

    const [open, setOpen] = useState(false);
    const [q, setQ] = useState("");

    const opacity = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(18)).current;

    useEffect(() => {
        if (!open) return;
        opacity.setValue(0);
        translateY.setValue(18);
        Animated.parallel([
            Animated.timing(opacity, { toValue: 1, duration: 140, useNativeDriver: true }),
            Animated.timing(translateY, { toValue: 0, duration: 180, useNativeDriver: true }),
        ]).start();
    }, [open, opacity, translateY]);

    const selectedLabel = useMemo(() => {
        if (!value) return "";
        return options.find((o) => o.value === value)?.label ?? "";
    }, [value, options]);

    const filtered = useMemo(() => {
        const s = q.trim().toLowerCase();
        if (!s) return options;
        return options.filter((o) => o.label.toLowerCase().includes(s));
    }, [options, q]);

    return (
        <View style={s.root}>
            {label ? <Text style={s.label}>{label}</Text> : null}

            <Pressable onPress={() => setOpen(true)} style={s.trigger}>
                <Text style={selectedLabel ? s.triggerText : s.triggerTextMuted}>
                    {selectedLabel || placeholder}
                </Text>
            </Pressable>

            <Modal
                visible={open}
                transparent
                animationType="fade"
                onRequestClose={() => {
                    setOpen(false);
                    setQ("");
                }}
            >
                {/* IMPORTANT:
                    - Backdrop pressable è separato
                    - Il sheet NON è dentro la pressable, così non si chiude quando tocchi dentro (search, lista, ecc.)
                */}
                <View style={s.modalBackdrop}>
                    <Pressable
                        style={s.backdropPress}
                        onPress={() => {
                            setOpen(false);
                            setQ("");
                        }}
                    />

                    <Animated.View style={[s.sheet, { opacity, transform: [{ translateY }] }]}>
                        {searchable ? (
                            <TextInput
                                value={q}
                                onChangeText={setQ}
                                placeholder="Cerca..."
                                placeholderTextColor={"rgba(229,231,235,0.70)"}
                                style={s.search}
                                autoFocus
                            />
                        ) : null}

                        <FlatList
                            keyboardShouldPersistTaps="handled"
                            data={filtered}
                            keyExtractor={(x) => x.value}
                            renderItem={({ item }) => {
                                const selected = item.value === value;
                                return (
                                    <Pressable
                                        onPress={() => {
                                            onChange(item.value);
                                            setOpen(false);
                                            setQ("");
                                        }}
                                        style={[s.option, selected ? s.optionSelected : null]}
                                    >
                                        <Text style={s.optionText}>{item.label}</Text>
                                    </Pressable>
                                );
                            }}
                            ItemSeparatorComponent={() => <View style={s.sep} />}
                        />
                    </Animated.View>
                </View>
            </Modal>
        </View>
    );
}
