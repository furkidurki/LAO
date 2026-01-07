export const ORDER_STATUSES = ["ordinato", "arrivato", "venduto", "in_prestito"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export function formatOrderStatus(s: OrderStatus) {
    switch (s) {
        case "in_prestito":
            return "in prestito";
        default:
            return s;
    }
}

export type OrderPurchaseStage = "ordine_nuovo" | "in_lavorazione" | "concluso";

export function formatOrderPurchaseStage(x: OrderPurchaseStage) {
    switch (x) {
        case "ordine_nuovo":
            return "ordine nuovo";
        case "in_lavorazione":
            return "in lavorazione";
        case "concluso":
            return "concluso";
    }
}

export type Order = {
    id: string;

    // cliente
    clientId: string;
    code: string;
    ragioneSociale: string;

    // materiale
    materialType: string;
    materialName?: string;

    // opzionale
    description?: string;

    quantity: number;

    distributorId: string;
    distributorName: string;

    unitPrice: number;
    totalPrice: number;

    // stati: ordinato -> arrivato -> (venduto / in_prestito)
    status: OrderStatus;

    // configurazione: 1 seriale per ogni pezzo
    serialNumbers?: string[];

    // acquisto per singolo articolo
    // boughtFlags[i] = true significa comprato (ma non arrivato)
    boughtFlags?: boolean[];
    boughtAtMs?: (number | null)[];

    // etichette dell'ordine
    flagToReceive?: boolean;
    flagToPickup?: boolean;

    // vecchi campi (li lascio per compatibilità, anche se ora non li usiamo)
    orderDateMs?: number;
    loanMonthsPlanned?: number;
    loanDueMs?: number;
    loanStartMs?: number;

    createdAt?: any;
    updatedAt?: any;
};

function ensureBoolArray(v: boolean[] | undefined, len: number) {
    const out = Array.from({ length: Math.max(0, len) }, () => false);
    if (!Array.isArray(v)) return out;
    for (let i = 0; i < out.length; i++) out[i] = Boolean(v[i]);
    return out;
}

function ensureNullableNumberArray(v: Array<number | null> | undefined, len: number) {
    const out: (number | null)[] = Array.from({ length: Math.max(0, len) }, () => null);
    if (!Array.isArray(v)) return out;
    for (let i = 0; i < out.length; i++) {
        const raw = v[i];
        out[i] = typeof raw === "number" && Number.isFinite(raw) ? raw : null;
    }
    return out;
}

export function getOrderBoughtFlags(o: Order) {
    return ensureBoolArray(o.boughtFlags, o.quantity);
}

export function getOrderBoughtAtMs(o: Order) {
    return ensureNullableNumberArray(o.boughtAtMs as any, o.quantity);
}

export function getOrderBoughtCount(o: Order) {
    const flags = getOrderBoughtFlags(o);
    let c = 0;
    for (const x of flags) if (x) c++;
    return c;
}

export function getOrderPurchaseStage(o: Order): OrderPurchaseStage {
    const q = Math.max(0, o.quantity || 0);
    const bought = getOrderBoughtCount(o);
    if (q === 0 || bought === 0) return "ordine_nuovo";
    if (bought < q) return "in_lavorazione";
    return "concluso";
}

export function formatDayFromMs(ms: number | null | undefined) {
    if (typeof ms !== "number" || !Number.isFinite(ms)) return "-";
    const d = new Date(ms);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const da = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${da}`;
}
