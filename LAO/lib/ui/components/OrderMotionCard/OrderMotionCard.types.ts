export type OrderMotionCardLine = {
    label: string;
    value: string;
};

export type OrderMotionCardAction = {
    label: string;
    onPress: () => void;
};

export type OrderMotionCardProps = {
    index: number;
    title: string;
    badge: string;

    // Used to pick the gradient/accent color.
    status?: string;

    // Small 1-line text under the title (Home use-case).
    meta?: string;

    // Optional extra rows like "Stato: Ordinato".
    lines?: OrderMotionCardLine[];

    // Small pills shown under the content (eg: "Da ordinare 2").
    chips?: string[];

    // Optional action button (eg: "Modifica").
    action?: OrderMotionCardAction;

    // If set, the whole card is clickable (native: only if action is not set).
    onPress?: () => void;
};
