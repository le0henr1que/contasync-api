import { Role } from '@prisma/client';
export declare class RegisterDto {
    email: string;
    password: string;
    name: string;
    role?: Role;
}
export declare class RegisterAccountantDto extends RegisterDto {
    companyName: string;
    cnpj: string;
    crc: string;
    phone?: string;
}
