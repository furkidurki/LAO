export type AppRole = "admin" | "staff" | "viewer";

export type AppUserDoc = {
    role: AppRole;
    email?: string;
    firstName?: string;
    lastName?: string;
    createdAt?: any;
    updatedAt?: any;
};
