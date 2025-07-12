import { z } from "zod";

export const itemMetadataSchema = z.object({
    itemId: z.string().uuid(),
    userId: z.string().uuid(),
    nameOfTheItem: z
        .string()
        .min(1, "The name of the item is required")
        .max(75, "The name of the item must be less than 75 characters"),
    generalDescriptionOfTheItem: z
        .string()
        .min(1, "The general description of the item is required")
        .max(
            250,
            "The general description of the item must be less than 250 characters"
        )
        .optional(),
});
export type ItemCreateType = z.infer<typeof itemMetadataSchema>;
