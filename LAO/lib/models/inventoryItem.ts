// cose all'interno del magazzino (anche oggetti "già in magazzino" senza cliente)

export type InventoryItem = {
    id: string;

    // possono essere vuoti (""), ad es. per oggetti già in magazzino
    lastClientCode: string;
    lastClientRagioneSociale: string;

    //  seriale opzionale (salvato comunque come stringa, anche se vuota)
    serialNumber: string;

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

// Input per creazione: permette di NON mettere cliente, e seriale è opzionale.
export type CreateInventoryItemInput = {
    lastClientCode?: string;
    lastClientRagioneSociale?: string;
    serialNumber?: string;

    materialType: string;
    description: string;

    quantity: number;

    distributorId: string;
    distributorName: string;

    unitPrice: number;
    totalPrice: number;
};
