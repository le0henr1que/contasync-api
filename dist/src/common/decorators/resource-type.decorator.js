"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CheckResourceLimit = void 0;
const common_1 = require("@nestjs/common");
const plan_limits_guard_1 = require("../guards/plan-limits.guard");
const CheckResourceLimit = (resourceType) => (0, common_1.SetMetadata)(plan_limits_guard_1.RESOURCE_TYPE_KEY, resourceType);
exports.CheckResourceLimit = CheckResourceLimit;
//# sourceMappingURL=resource-type.decorator.js.map