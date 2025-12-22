///variabile con lgi stati delle consegne
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

    code: string; // codice cliente
    ragioneSociale: string;

    materialType: string;
    description: string;

    quantity: number;

    distributorId: string;
    distributorName: string;

    unitPrice: number;
    totalPrice: number;

    status: OrderStatus;

    emailTo?: string;

    createdAt?: any;
    updatedAt?: any;
};

export type CreateOrderInput = Omit<Order, "id" | "createdAt" | "updatedAt">;
