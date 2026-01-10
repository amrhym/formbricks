import { z } from "zod";
import { logger } from "@hivecfm/logger";
import { ValidationError } from "@hivecfm/types/errors";

type ValidationPair<T> = [T, z.ZodType<T>];

export function validateInputs<T extends ValidationPair<any>[]>(
  ...pairs: T
): { [K in keyof T]: T[K] extends ValidationPair<infer U> ? U : never } {
  const parsedData: any[] = [];

  for (const [value, schema] of pairs) {
    const inputValidation = schema.safeParse(value);
    if (!inputValidation.success) {
      logger.error(
        inputValidation.error,
        `Validation failed for ${JSON.stringify(value).substring(0, 100)} and ${JSON.stringify(schema)}`
      );
      throw new ValidationError("Validation failed");
    }
    parsedData.push(inputValidation.data);
  }

  return parsedData as { [K in keyof T]: T[K] extends ValidationPair<infer U> ? U : never };
}
