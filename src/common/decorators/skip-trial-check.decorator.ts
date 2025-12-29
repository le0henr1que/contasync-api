import { SetMetadata } from '@nestjs/common';
import { SKIP_TRIAL_CHECK } from '../guards/trial.guard';

/**
 * Decorator to skip trial expiration check
 *
 * Use this on routes that should be accessible even when trial is expired,
 * such as billing/subscription management endpoints.
 *
 * @example
 * ```typescript
 * @Get('billing')
 * @SkipTrialCheck()
 * getBillingInfo() {
 *   // This route will be accessible even if trial is expired
 * }
 * ```
 */
export const SkipTrialCheck = () => SetMetadata(SKIP_TRIAL_CHECK, true);
