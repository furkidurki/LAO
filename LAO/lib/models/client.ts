//i dati del cliente
export type Client = {
    id: string;
    code: string;
    ragioneSociale: string;
    ragioneLower: string; // ragioneSociale in minuscolo (serve per la ricerca)
    email?: string;
};
