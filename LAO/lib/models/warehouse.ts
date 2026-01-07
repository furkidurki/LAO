export type WarehouseItem = {
    id: string;
    materialLabel: string; // gruppo (Portatile 15 ecc.)
    serialNumber: string;
    serialLower: string;

    serialDesc?: string;

    createdAt?: any;
    updatedAt?: any;
};
