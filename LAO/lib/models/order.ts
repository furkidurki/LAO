export const ORDER_STATUSES = ["arrivato", "in_consegna", "in_prestito", "venduto"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export type Order = {
    id: string;

    code: string;
    ragioneSociale: string;

    materialType: string;   // id del materiale
    materialName?: string;  // nome materiale (comodo da mostrare)

    description?: string;

    quantity: number;

    distributorId: string;
    distributorName: string;

    unitPrice: number;
    totalPrice: number;

    status: OrderStatus;

    emailTo?: string;

    createdAt?: any; // Firestore Timestamp
};
