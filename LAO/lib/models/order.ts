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

export type OrderItem = {
    id: string; // id interno (stabile dentro l'ordine)

    materialType: string;
    materialName?: string;
    description?: string;

    quantity: number;

    distributorId: string;
    distributorName: string;

    unitPrice: number;
    totalPrice: number;

    // acquisto per singolo pezzo
    // boughtFlags[i] = true significa comprato (ma non arrivato)
    boughtFlags?: boolean[];
    boughtAtMs?: (number | null)[];

    // ricezione/ritiro per singolo pezzo
    // receivedFlags[i] = true significa ricevuto/ritirato
    receivedFlags?: boolean[];
    receivedAtMs?: (number | null)[];
};

export type Order = {
    id: string;

    // cliente
    clientId: string;
    code: string;
    ragioneSociale: string;

    // --- legacy (compatibilità) ---
    // In passato l'ordine aveva 1 solo materiale.
    // Li teniamo perché altre pagine (pezzi, configurazione, ecc.) li usano ancora.
    materialType: string;
    materialName?: string;
    description?: string;
    quantity: number;
    distributorId: string;
    distributorName: string;
    unitPrice: number;
    totalPrice: number;

    // --- nuovo ---
    // ordine con più articoli diversi
    items?: OrderItem[];

    // stati: ordinato -> arrivato -> (venduto / in_prestito)
    status: OrderStatus;

    // configurazione: 1 seriale per ogni pezzo (solo per ordini mono-articolo)
    serialNumbers?: string[];

    // legacy: acquisto per singolo articolo dell'ordine (mono-articolo)
    boughtFlags?: boolean[];
    boughtAtMs?: (number | null)[];

    // legacy: ricezione/ritiro per singolo articolo (mono-articolo)
    receivedFlags?: boolean[];
    receivedAtMs?: (number | null)[];

    // etichette dell'ordine
    flagToReceive?: boolean;
    flagToPickup?: boolean;

    // vecchi campi
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

function safeNumber(v: any, fallback = 0) {
    const n = typeof v === "number" ? v : Number(v);
    if (!Number.isFinite(n)) return fallback;
    return n;
}

function normalizeItem(raw: Partial<OrderItem> | undefined, index: number): OrderItem {
    const quantity = Math.max(0, Math.floor(safeNumber(raw?.quantity, 0)));
    const unitPrice = Math.max(0, safeNumber(raw?.unitPrice, 0));

    const out: OrderItem = {
        id: String(raw?.id || `item-${index}`),
        materialType: String(raw?.materialType || ""),
        materialName: raw?.materialName ? String(raw.materialName) : undefined,
        description: raw?.description ? String(raw.description) : undefined,
        quantity,
        distributorId: String(raw?.distributorId || ""),
        distributorName: String(raw?.distributorName || ""),
        unitPrice,
        totalPrice: Math.round(quantity * unitPrice * 100) / 100,
        boughtFlags: ensureBoolArray(raw?.boughtFlags, quantity),
        boughtAtMs: ensureNullableNumberArray(raw?.boughtAtMs as any, quantity),
        receivedFlags: ensureBoolArray(raw?.receivedFlags, quantity),
        receivedAtMs: ensureNullableNumberArray(raw?.receivedAtMs as any, quantity),
    };

    return out;
}

// ritorna SEMPRE items (anche per ordini vecchi)
export function getOrderItems(o: Order): OrderItem[] {
    const arr = Array.isArray(o.items) ? o.items : [];
    if (arr.length > 0) return arr.map((it, i) => normalizeItem(it, i));

    // fallback legacy: ordine mono-articolo
    return [
        normalizeItem(
            {
                id: "legacy",
                materialType: o.materialType,
                materialName: o.materialName,
                description: o.description,
                quantity: o.quantity,
                distributorId: o.distributorId,
                distributorName: o.distributorName,
                unitPrice: o.unitPrice,
                totalPrice: o.totalPrice,
                boughtFlags: o.boughtFlags,
                boughtAtMs: o.boughtAtMs,
                receivedFlags: o.receivedFlags,
                receivedAtMs: o.receivedAtMs,
            },
            0
        ),
    ];
}

export function getOrderTotalQuantity(o: Order) {
    const items = getOrderItems(o);
    let q = 0;
    for (const it of items) q += Math.max(0, it.quantity || 0);
    return q;
}

export function getOrderTotalPriceFromItems(o: Order) {
    const items = getOrderItems(o);
    let t = 0;
    for (const it of items) t += safeNumber(it.totalPrice, 0);
    return Math.round(t * 100) / 100;
}

export function getOrderBoughtFlagsForItem(it: OrderItem) {
    return ensureBoolArray(it.boughtFlags, it.quantity);
}

export function getOrderBoughtAtMsForItem(it: OrderItem) {
    return ensureNullableNumberArray(it.boughtAtMs as any, it.quantity);
}

export function getOrderReceivedFlagsForItem(it: OrderItem) {
    return ensureBoolArray(it.receivedFlags, it.quantity);
}

export function getOrderReceivedAtMsForItem(it: OrderItem) {
    return ensureNullableNumberArray(it.receivedAtMs as any, it.quantity);
}

export function getOrderBoughtCountForItem(it: OrderItem) {
    const flags = getOrderBoughtFlagsForItem(it);
    let c = 0;
    for (const x of flags) if (x) c++;
    return c;
}

export function getOrderReceivedCountForItem(it: OrderItem) {
    const flags = getOrderReceivedFlagsForItem(it);
    let c = 0;
    for (const x of flags) if (x) c++;
    return c;
}

// quanti pezzi sono comprati ma NON ricevuti/ritirati
export function getOrderBoughtNotReceivedCountForItem(it: OrderItem) {
    const bought = getOrderBoughtFlagsForItem(it);
    const received = getOrderReceivedFlagsForItem(it);
    let c = 0;
    for (let i = 0; i < Math.max(bought.length, received.length); i++) {
        if (Boolean(bought[i]) && !Boolean(received[i])) c++;
    }
    return c;
}

export function getOrderBoughtCount(o: Order) {
    const items = getOrderItems(o);
    let c = 0;
    for (const it of items) c += getOrderBoughtCountForItem(it);
    return c;
}

export function getOrderBoughtNotReceivedCount(o: Order) {
    const items = getOrderItems(o);
    let c = 0;
    for (const it of items) c += getOrderBoughtNotReceivedCountForItem(it);
    return c;
}

export function getOrderToBuyCount(o: Order) {
    const total = getOrderTotalQuantity(o);
    const bought = getOrderBoughtCount(o);
    return Math.max(0, total - bought);
}

export function getOrderPurchaseStage(o: Order): OrderPurchaseStage {
    const q = getOrderTotalQuantity(o);
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

export function getOrderItemsTitle(o: Order) {
    const items = getOrderItems(o);
    const names = items
        .map((it) => (it.materialName && it.materialName.trim() ? it.materialName : it.materialType))
        .filter(Boolean);
    if (names.length === 0) return "-";
    if (names.length === 1) return String(names[0]);
    return `${names[0]} +${names.length - 1}`;
}
