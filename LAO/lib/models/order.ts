export const ORDER_STATUSES = ["ordinato", "consegnato"] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

// Ordine semplice (solo i campi che servono)
export type Order = {
    id: string;

    ragioneSociale: string;

    // materiale
    materialType: string; // id del materiale (come salvato in /materials)
    materialName?: string; // nome leggibile (snapshot)

    description?: string; // opzionale
    quantity: number;

    // distributore
    distributorId: string;
    distributorName: string;

    unitPrice: number;
    totalPrice: number;

    status: OrderStatus;

    createdAt?: any; // Firestore Timestamp
    updatedAt?: any;
};
