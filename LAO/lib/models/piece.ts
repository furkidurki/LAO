export type PieceStatus = "arrivato" | "venduto" | "in_prestito";

export type OrderPiece = {
    id: string;

    orderId: string;
    index: number;

    serialNumber: string;
    serialLower: string;

    clientId: string;
    code: string;
    ragioneSociale: string;

    materialType: string;
    materialName?: string;

    distributorId: string;
    distributorName: string;

    status: PieceStatus;

    // solo se in prestito
    loanStartMs?: number;

    createdAt?: any;
    updatedAt?: any;
};
