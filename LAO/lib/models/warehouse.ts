export type WarehouseItem = {
    id: string;
    materialLabel: string;
    serialNumber: string;
    serialLower: string;

    // Optional text for the single serial item
    serialDesc?: string;

    createdAt?: any;
    updatedAt?: any;
};
