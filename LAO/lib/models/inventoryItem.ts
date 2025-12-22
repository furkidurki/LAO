//cose allinterno del magazzino dopo avere le prestate etc.
export type InventoryItem = {
    id: string;

    lastClientCode: string;
    lastClientRagioneSociale: string;

    materialType: string;
    description: string;

    quantity: number;

    distributorId: string;
    distributorName: string;

    unitPrice: number;
    totalPrice: number;

    createdAt?: any;
    updatedAt?: any;
};

export type CreateInventoryItemInput = Omit<
    InventoryItem,
    "id" | "createdAt" | "updatedAt"
>;
