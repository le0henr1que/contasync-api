export declare enum TenantType {
    INDIVIDUAL = "INDIVIDUAL",
    ACCOUNTANT_FIRM = "ACCOUNTANT_FIRM"
}
export declare class SignupDto {
    name: string;
    email: string;
    password: string;
    type: TenantType;
    cpfCnpj?: string;
    companyName?: string;
    planId?: string;
}
