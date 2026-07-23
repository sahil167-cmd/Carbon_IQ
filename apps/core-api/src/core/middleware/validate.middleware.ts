import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { ValidationError } from '../errors/app.error';

type ValidateTarget = 'body' | 'query' | 'params';

/**
 * Validate Middleware Factory
 * validate(schema) — validates req.body by default.
 * validate(schema, 'query') — validates req.query.
 * validate(schema, 'params') — validates req.params.
 *
 * On success: attaches the parsed (type-safe) data back to req[target].
 * On failure: throws ValidationError with field-level Zod errors mapped to
 * { fieldName: ['error message', ...] } format.
 *
 * The same Zod schema is used for both runtime validation and TypeScript
 * type inference — no drift between validation and types.
 */
export function validate(schema: ZodSchema, target: ValidateTarget = 'body') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[target]);

    if (!result.success) {
      const details = buildFieldErrors(result.error);
      return next(new ValidationError('Validation failed', details));
    }

    // Replace with parsed + coerced data (e.g. string → number transformations)
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    req[target] = result.data as any;
    next();
  };
}

function buildFieldErrors(error: ZodError): Record<string, string[]> {
  const details: Record<string, string[]> = {};

  for (const issue of error.issues) {
    const field = issue.path.join('.') || '_root';
    if (!details[field]) details[field] = [];
    details[field].push(issue.message);
  }

  return details;
}
