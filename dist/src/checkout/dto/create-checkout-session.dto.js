"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateCheckoutSessionDto = void 0;
const class_validator_1 = require("class-validator");
const client_1 = require("@prisma/client");
class CreateCheckoutSessionDto {
    email;
    name;
    password;
    cpfCnpj;
    companyName;
    crc;
    phone;
    planId;
    billingInterval;
}
exports.CreateCheckoutSessionDto = CreateCheckoutSessionDto;
__decorate([
    (0, class_validator_1.IsEmail)({}, { message: 'Email inválido' }),
    (0, class_validator_1.IsNotEmpty)({ message: 'Email é obrigatório' }),
    __metadata("design:type", String)
], CreateCheckoutSessionDto.prototype, "email", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'Nome é obrigatório' }),
    __metadata("design:type", String)
], CreateCheckoutSessionDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(8, { message: 'Senha deve ter no mínimo 8 caracteres' }),
    (0, class_validator_1.IsNotEmpty)({ message: 'Senha é obrigatória' }),
    __metadata("design:type", String)
], CreateCheckoutSessionDto.prototype, "password", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'CPF/CNPJ é obrigatório' }),
    (0, class_validator_1.Matches)(/^\d{11}$|^\d{14}$/, { message: 'CPF/CNPJ inválido. Deve conter 11 (CPF) ou 14 (CNPJ) dígitos' }),
    __metadata("design:type", String)
], CreateCheckoutSessionDto.prototype, "cpfCnpj", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'Nome da empresa é obrigatório' }),
    __metadata("design:type", String)
], CreateCheckoutSessionDto.prototype, "companyName", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'CRC é obrigatório' }),
    __metadata("design:type", String)
], CreateCheckoutSessionDto.prototype, "crc", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateCheckoutSessionDto.prototype, "phone", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'ID do plano é obrigatório' }),
    __metadata("design:type", String)
], CreateCheckoutSessionDto.prototype, "planId", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(client_1.BillingInterval, { message: 'Intervalo de cobrança inválido. Use MONTHLY ou YEARLY' }),
    (0, class_validator_1.IsNotEmpty)({ message: 'Intervalo de cobrança é obrigatório' }),
    __metadata("design:type", String)
], CreateCheckoutSessionDto.prototype, "billingInterval", void 0);
//# sourceMappingURL=create-checkout-session.dto.js.map