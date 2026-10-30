import type { StandardSchemaWithJSON } from "@modelcontextprotocol/server";
import type { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

export function toMcpInputSchema<Input, Output>(schema: z.ZodType<Output, z.ZodTypeDef, Input>): StandardSchemaWithJSON<Input, Output> {
  const jsonSchema = zodToJsonSchema(schema as unknown as Parameters<typeof zodToJsonSchema>[0]);
  return {
    ["~standard"]: {
      version: 1,
      vendor: "zod",
      validate: value => {
        const result = schema.safeParse(value);
        return result.success ? { value: result.data } : { issues: result.error.issues };
      },
      jsonSchema: {
        input: () => jsonSchema,
        output: () => jsonSchema,
      },
    },
  };
}
