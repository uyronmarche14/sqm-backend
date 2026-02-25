import { ZodError } from 'zod';
import { ValidationError } from '../errors/AppError.js';
/**
 * Validates the Request against a Zod Schema
 */
export const validate = (schema) => {
    return async (req, _res, next) => {
        try {
            await schema.parseAsync({
                body: req.body,
                query: req.query,
                params: req.params,
            });
            return next();
        }
        catch (error) {
            if (error instanceof ZodError) {
                // Format Zod errors nicely using .issues
                const formattedErrors = error.issues.map((e) => ({
                    path: e.path.join('.'),
                    message: e.message,
                }));
                return next(new ValidationError(formattedErrors, 'Invalid input data'));
            }
            return next(error);
        }
    };
};
