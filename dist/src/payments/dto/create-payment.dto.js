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
exports.CreatePaymentDto = void 0;
const class_validator_1 = require("class-validator");
const client_1 = require("@prisma/client");
const payment_type_enum_1 = require("../enums/payment-type.enum");
const recurring_frequency_enum_1 = require("../enums/recurring-frequency.enum");
class CreatePaymentDto {
    clientId;
    paymentType;
    title;
    amount;
    paymentDate;
    dueDate;
    paymentMethod;
    reference;
    notes;
    isRecurring;
    recurringFrequency;
    recurringDayOfMonth;
    recurringEndDate;
}
exports.CreatePaymentDto = CreatePaymentDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreatePaymentDto.prototype, "clientId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(payment_type_enum_1.PaymentType, { message: 'Tipo de pagamento inválido' }),
    __metadata("design:type", String)
], CreatePaymentDto.prototype, "paymentType", void 0);
__decorate([
    (0, class_validator_1.IsNotEmpty)({ message: 'Digite o título do pagamento' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreatePaymentDto.prototype, "title", void 0);
__decorate([
    (0, class_validator_1.IsNotEmpty)({ message: 'Digite o valor do pagamento' }),
    (0, class_validator_1.IsNumber)({}, { message: 'Valor inválido' }),
    (0, class_validator_1.Min)(0.01, { message: 'Valor deve ser maior que zero' }),
    __metadata("design:type", Number)
], CreatePaymentDto.prototype, "amount", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)({}, { message: 'Data de pagamento inválida' }),
    __metadata("design:type", String)
], CreatePaymentDto.prototype, "paymentDate", void 0);
__decorate([
    (0, class_validator_1.IsNotEmpty)({ message: 'Selecione a data de vencimento' }),
    (0, class_validator_1.IsDateString)({}, { message: 'Data de vencimento inválida' }),
    __metadata("design:type", String)
], CreatePaymentDto.prototype, "dueDate", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(client_1.PaymentMethod, { message: 'Forma de pagamento inválida' }),
    __metadata("design:type", String)
], CreatePaymentDto.prototype, "paymentMethod", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreatePaymentDto.prototype, "reference", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreatePaymentDto.prototype, "notes", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreatePaymentDto.prototype, "isRecurring", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(recurring_frequency_enum_1.RecurringFrequency, { message: 'Frequência de recorrência inválida' }),
    __metadata("design:type", String)
], CreatePaymentDto.prototype, "recurringFrequency", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1, { message: 'Dia do mês deve ser entre 1 e 31' }),
    (0, class_validator_1.Max)(31, { message: 'Dia do mês deve ser entre 1 e 31' }),
    __metadata("design:type", Number)
], CreatePaymentDto.prototype, "recurringDayOfMonth", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)({}, { message: 'Data de término inválida' }),
    __metadata("design:type", String)
], CreatePaymentDto.prototype, "recurringEndDate", void 0);
//# sourceMappingURL=create-payment.dto.js.map