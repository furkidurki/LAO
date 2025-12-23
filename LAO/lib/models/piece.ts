export type PieceStatus = "arrivato" | "venduto" | "in_prestito";

export type OrderPiece = {
    id: string;

    orderId: string;
    index: number; // 0..quantity-1

    serialNumber: string;
    serialLower: string;

    // snapshot info (così non perdi dati se cambiano)
    clientId: string;
    code: string;
    ragioneSociale: string;

    materialType: string;
    materialName?: string;

    distributorId: string;
    distributorName: string;

    status: PieceStatus;

    createdAt?: any;
    updatedAt?: any;
};
