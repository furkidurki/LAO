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

    // vecchi campi (li lascio per compatibilità, anche se ora non li usiamo)
    orderDateMs?: number;
    loanMonthsPlanned?: number;
    loanDueMs?: number;
    loanStartMs?: number;

    createdAt?: any;
    updatedAt?: any;
};
