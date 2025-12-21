import { CheckoutService } from './checkout.service';
import { CreateCheckoutSessionDto } from './dto/create-checkout-session.dto';
export declare class CheckoutController {
    private readonly checkoutService;
    constructor(checkoutService: CheckoutService);
    createSession(dto: CreateCheckoutSessionDto): Promise<{
        sessionId: string;
        checkoutUrl: string;
    }>;
}
