import React, { useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { theme } from "@/lib/ui/theme";
import type { OrderMotionCardProps } from "./OrderMotionCard.types";

function getAccent(status: string | undefined, index: number) {
    const s = (status ?? "").toLowerCase();
    if (s.includes("ordinato")) return theme.colors.primary;
    if (s.includes("arrivato")) return theme.colors.success;
    if (s.includes("venduto")) return theme.colors.warning;
    if (s.includes("prestito")) return theme.colors.primary2;

    const palette = [theme.colors.primary, theme.colors.primary2, theme.colors.warning, theme.colors.success];
    return palette[index % palette.length];
}

export function OrderMotionCard(props: OrderMotionCardProps) {
    const { index, title, badge, status, meta, lines, chips, action, onPress } = props;

    const clickable = Boolean(onPress) || Boolean(action?.onPress);
    const [hovered, setHovered] = useState(false);

    const accent = useMemo(() => getAccent(status, index), [status, index]);

    const lineSummary = useMemo(() => {
        if (!lines?.length) return "";
        return lines
            .map((l) => {
                const lbl = l.label.endsWith(":") ? l.label.slice(0, -1) : l.label;
                return `${lbl}: ${l.value}`;
            })
            .join(" • ");
    }, [lines]);

    const cardStyle: CSSProperties = {
        position: "relative",
        background: theme.colors.surface,
        borderRadius: 18,
        border: `1px solid ${theme.colors.border}`,
        padding: "14px 16px",
        marginBottom: 14,
        cursor: clickable ? "pointer" : "default",
        transform: hovered && clickable ? "translateY(-2px)" : "translateY(0)",
        boxShadow: hovered && clickable ? "0 16px 40px rgba(0,0,0,0.10)" : "0 10px 30px rgba(0,0,0,0.08)",
        transition: "transform 180ms ease, box-shadow 180ms ease",
        overflow: "hidden",
    };

    const badgeStyle: CSSProperties = {
        border: `1px solid ${theme.colors.border}`,
        background: theme.colors.surface2,
        padding: "6px 10px",
        borderRadius: 999,
        fontWeight: 900,
        fontSize: 12,
        color: theme.colors.text,
        whiteSpace: "nowrap",
        maxWidth: 160,
        overflow: "hidden",
        textOverflow: "ellipsis",
    };

    const chipStyle: CSSProperties = {
        border: `1px solid ${theme.colors.border}`,
        background: theme.colors.surface2,
        padding: "6px 10px",
        borderRadius: 999,
        fontWeight: 900,
        fontSize: 12,
        color: theme.colors.text,
        whiteSpace: "nowrap",
    };

    const actionBtn: CSSProperties = {
        border: "none",
        borderRadius: 14,
        padding: "10px 12px",
        fontWeight: 900,
        cursor: "pointer",
        background: theme.colors.primary2,
        color: theme.colors.white,
        boxShadow: "0 10px 24px rgba(0,0,0,0.10)",
    };

    return (
        <div
            style={cardStyle}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            onClick={() => {
                if (onPress) onPress();
                else action?.onPress();
            }}
            role={clickable ? "button" : undefined}
            tabIndex={clickable ? 0 : undefined}
        >
            <div
                style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 4,
                    background: accent,
                }}
            />

            <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                        <div
                            style={{
                                fontWeight: 900,
                                fontSize: 16,
                                color: theme.colors.text,
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                            }}
                        >
                            {title}
                        </div>
                        <div style={badgeStyle}>{badge.toUpperCase()}</div>
                    </div>

                    {(meta || lineSummary) ? (
                        <div style={{ marginTop: 6, color: theme.colors.muted, fontWeight: 900, fontSize: 13 }}>
                            {meta ? <span style={{ color: theme.colors.text }}>{meta}</span> : null}
                            {meta && lineSummary ? <span> • </span> : null}
                            {lineSummary ? <span>{lineSummary}</span> : null}
                        </div>
                    ) : null}

                    {chips?.length ? (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
                            {chips.map((c) => (
                                <span key={c} style={chipStyle}>
                                    {c}
                                </span>
                            ))}
                        </div>
                    ) : null}
                </div>

                {action ? (
                    <div style={{ flexShrink: 0, marginTop: 2 }}>
                        <button
                            type="button"
                            style={actionBtn}
                            onClick={(e) => {
                                e.stopPropagation();
                                action.onPress();
                            }}
                        >
                            {action.label}
                        </button>
                    </div>
                ) : null}
            </div>
        </div>
    );
}
