export const ORDER_STATUSES = [
    "arrivato",
    "in_consegna",
    "in_prestito",
    "magazzino",
    "venduto",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export type Order = {
    id: string;

    // cliente
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

    // nuovi dati
    orderDateMs?: number;
    loanMonthsPlanned?: number;
    loanDueMs?: number;
    loanStartMs?: number;


    createdAt?: any; // Firestore Timestamp
    updatedAt?: any;
};
