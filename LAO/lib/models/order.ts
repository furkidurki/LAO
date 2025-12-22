export const ORDER_STATUSES = [
    "arrivato",
    "in_consegna",
    "in_prestito",
    "magazzino",
    "venduto",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export type LoanHistoryItem = {
    clientId: string;
    ragioneSociale: string;
    code: string;
    startMs: number;
    endMs: number;
    days: number; // durata prestito
};

export type Order = {
    id: string;

    // ✅ cliente scelto da lista (Settings)
    clientId: string;
    code: string;
    ragioneSociale: string;

    materialType: string;
    materialName?: string;

    description?: string;
    quantity: number;

    distributorId: string;
    distributorName: string;

    unitPrice: number;
    totalPrice: number;

    status: OrderStatus;

    // tracking prestito
    loanStartMs?: number; // quando entra in "in_prestito"
    loanHistory?: LoanHistoryItem[];

    createdAt?: any; // Firestore Timestamp
    updatedAt?: any;
};
