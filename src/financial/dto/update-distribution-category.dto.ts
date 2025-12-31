import { PartialType } from '@nestjs/mapped-types';
import { CreateDistributionCategoryDto } from './create-distribution-category.dto';

export class UpdateDistributionCategoryDto extends PartialType(
  CreateDistributionCategoryDto,
) {}
