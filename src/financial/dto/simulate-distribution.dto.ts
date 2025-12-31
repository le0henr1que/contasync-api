import { IsNumber, IsNotEmpty, Min } from 'class-validator';

export class SimulateDistributionDto {
  @IsNumber({}, { message: 'O valor da entrada deve ser um número válido' })
  @IsNotEmpty({ message: 'O valor da entrada é obrigatório' })
  @Min(0, { message: 'O valor da entrada não pode ser negativo' })
  incomeAmount: number;
}
