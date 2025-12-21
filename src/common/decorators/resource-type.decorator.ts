import { SetMetadata } from '@nestjs/common';
import { ResourceType, RESOURCE_TYPE_KEY } from '../guards/plan-limits.guard';

export const CheckResourceLimit = (resourceType: ResourceType) =>
  SetMetadata(RESOURCE_TYPE_KEY, resourceType);
