export type AppRole = "admin" | "staff" | "viewer";

export type AppUserDoc = {
    role: AppRole;
    email?: string;
    createdAt?: any;
    updatedAt?: any;
};
