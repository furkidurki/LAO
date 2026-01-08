import React, { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";

// Assicurati che il percorso sia corretto o sostituisci con i tuoi colori
import { theme } from "@/lib/ui/theme";
import type { OrderMotionCardProps } from "./OrderMotionCard.types";

function hue(h: number) {
    return `hsl(${h}, 100%, 60%)`; // Ho alzato leggermente la luminosità per il dark mode
}

function getHues(status: string | undefined, index: number): [number, number] {
    const s = (status ?? "").toLowerCase();

    if (s.includes("ordinato")) return [210, 245];
    if (s.includes("arrivato")) return [125, 165];
    if (s.includes("venduto")) return [20, 45];
    if (s.includes("prestito")) return [275, 315];

    const base = (index * 35) % 360;
    return [base, (base + 35) % 360];
}

function prefersReducedMotion() {
    if (typeof window === "undefined") return false;
    return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
}

function useInViewOnce<T extends HTMLElement>(threshold = 0.2) {
    const ref = useRef<T | null>(null);
    const [inView, setInView] = useState(false);

    useEffect(() => {
        if (inView) return;
        if (typeof window === "undefined") return;

        const el = ref.current;
        if (!el) return;

        if (prefersReducedMotion()) {
            setInView(true);
            return;
        }

        const obs = new IntersectionObserver(
            (entries) => {
                if (entries[0]?.isIntersecting) {
                    setInView(true);
                    obs.disconnect();
                }
            },
            { threshold }
        );

        obs.observe(el);
        return () => obs.disconnect();
    }, [inView, threshold]);

    return { ref, inView };
}

export function OrderMotionCard(props: OrderMotionCardProps) {
    const { index, title, badge, status, meta, lines, chips, action, onPress } = props;

    const clickable = Boolean(onPress) || Boolean(action?.onPress);
    const { ref, inView } = useInViewOnce<HTMLDivElement>(0.2);

    const [hovered, setHovered] = useState(false);
    const [pressed, setPressed] = useState(false);

    // Colori dinamici
    const [hueA, hueB] = useMemo(() => getHues(status, index), [status, index]);
    const accentGradient = useMemo(
        () => `linear-gradient(180deg, ${hue(hueA)}, ${hue(hueB)})`,
        [hueA, hueB]
    );
    const shadowColor = useMemo(() => hue(hueA), [hueA]);

    // Formattazione righe
    const lineSummary = useMemo(() => {
        if (!lines?.length) return "";
        return lines
            .map((l) => {
                const lbl = l.label.endsWith(":") ? l.label.slice(0, -1) : l.label;
                return `${lbl}: ${l.value}`;
            })
            .join(" • ");
    }, [lines]);

    const reduce = prefersReducedMotion();

    // --- STILI DINAMICI ---

    // L'animazione di entrata (fade in + slide up)
    const entryTransform = reduce ? "none" : inView ? "translateY(0) scale(1)" : "translateY(20px) scale(0.98)";
    const entryOpacity = reduce ? 1 : inView ? 1 : 0;

    // L'effetto Hover "Pop-out"
    // Quando hovered: sale di 5px e scala leggermente
    // Quando pressed: scende leggermente (effetto click fisico)
    const hoverTransform = hovered && clickable && !pressed
        ? "translateY(-5px) scale(1.01)"
        : pressed
            ? "translateY(-2px) scale(0.99)" // Piccolo rimbalzo al click
            : "translateY(0) scale(1)";

    const currentTransform = reduce ? "none" : inView ? hoverTransform : entryTransform;

    // Ombra: diventa colorata e intensa quando ci passi sopra
    const baseShadow = "0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.15)";
    const hoverShadow = `0 15px 30px -5px rgba(0,0,0,0.4), 0 0 20px -5px ${shadowColor.replace(")", ", 0.25)")}`; // Glow colorato

    const cardStyle: CSSProperties = {
        ...baseCardStyle,
        opacity: entryOpacity,
        transform: currentTransform,
        boxShadow: hovered && clickable ? hoverShadow : baseShadow,
        borderLeft: `5px solid ${hue(hueA)}`, // Bordo colorato a sinistra
        cursor: clickable ? "pointer" : "default",
        transition: "all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.5s ease", // Easing "bouncy" per effetto pop
    };

    // Sfondo gradiente sottile interno (opzionale, per dare profondità)
    const innerBackground: CSSProperties = {
        ...fillAbs,
        background: accentGradient,
        opacity: hovered ? 0.08 : 0.03, // Si illumina leggermente al passaggio
        transition: "opacity 0.4s ease",
    };

    return (
        <div
            ref={ref}
            style={cardStyle}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => { setHovered(false); setPressed(false); }}
            onMouseDown={() => setPressed(true)}
            onMouseUp={() => setPressed(false)}
            onClick={() => {
                if (onPress) onPress();
                else action?.onPress();
            }}
            role={clickable ? "button" : undefined}
            tabIndex={clickable ? 0 : undefined}
        >
            {/* Sfondo sottile colorato */}
            <div style={innerBackground} />

            <div style={contentRow}>
                <div style={leftCol}>
                    <div style={headerRow}>
                        <div style={titleStyle}>{title}</div>
                        {/* Badge spostato vicino al titolo per compattezza visiva */}
                        <div style={{...badgeStyle, borderColor: hue(hueB), color: hue(hueB)}}>{badge.toUpperCase()}</div>
                    </div>

                    {(meta || lineSummary) ? (
                        <div style={subStyle}>
                            {meta ? <span style={{color: theme.colors.text}}>{meta}</span> : null}
                            {meta && lineSummary ? <span style={dot}> • </span> : null}
                            {lineSummary ? <span>{lineSummary}</span> : null}
                        </div>
                    ) : null}

                    {chips?.length ? (
                        <div style={chipsRow}>
                            {chips.map((c) => (
                                <span key={c} style={chip}>
                  {c}
                </span>
                            ))}
                        </div>
                    ) : null}
                </div>

                {/* Bottone azione a destra */}
                {action ? (
                    <div style={rightCol}>
                        <button
                            type="button"
                            style={{
                                ...btn,
                                background: hovered ? theme.colors.primary : 'rgba(255,255,255,0.1)', // Bottone reagisce all'hover della card
                                color: hovered ? theme.colors.white : theme.colors.text
                            }}
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

/**
 * Styles Refined
 */

const baseCardStyle: CSSProperties = {
    position: "relative",
    overflow: "hidden", // Contenuto interno non esce, ma l'ombra è fuori (gestita dal browser)
    background: "#12141C", // Colore scuro 'surface' (o usa theme.colors.surface)
    borderRadius: 12,
    marginBottom: 16,
    padding: "16px 20px",
    border: `1px solid rgba(255,255,255,0.08)`,
    // Nota: l'ombra e il transform sono gestiti inline nel componente per le performance
};

const fillAbs: CSSProperties = {
    position: "absolute",
    inset: 0,
    pointerEvents: "none",
};

const contentRow: CSSProperties = {
    position: "relative", // Per stare sopra al background
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    zIndex: 1,
};

const leftCol: CSSProperties = {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: 6,
    minWidth: 0,
};

const rightCol: CSSProperties = {
    flexShrink: 0,
};

const headerRow: CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 12,
    marginBottom: 4
}

const titleStyle: CSSProperties = {
    color: "#fff", // O theme.colors.text
    fontWeight: 700,
    fontSize: 17,
    letterSpacing: "-0.01em",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
};

const subStyle: CSSProperties = {
    color: "#9ca3af", // O theme.colors.muted
    fontSize: 14,
    lineHeight: "20px",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    display: 'flex',
    alignItems: 'center'
};

const dot: CSSProperties = {
    margin: "0 6px",
    opacity: 0.4,
};

const chipsRow: CSSProperties = {
    display: "flex",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 4,
};

const chip: CSSProperties = {
    color: "#d1d5db",
    fontSize: 11,
    fontWeight: 600,
    padding: "4px 8px",
    borderRadius: 6,
    background: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(255,255,255,0.05)",
};

const badgeStyle: CSSProperties = {
    fontSize: 10,
    fontWeight: 800,
    padding: "2px 8px",
    borderRadius: 99,
    border: "1px solid", // Il colore viene iniettato inline
    background: "rgba(0,0,0,0.2)",
    letterSpacing: "0.05em",
};

const btn: CSSProperties = {
    border: "none",
    borderRadius: 8,
    padding: "8px 16px",
    fontWeight: 600,
    fontSize: 13,
    cursor: "pointer",
    transition: "all 0.2s ease",
};