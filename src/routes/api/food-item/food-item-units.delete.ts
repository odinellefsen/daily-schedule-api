import foodItem from "./food-item.create";

foodItem.delete("/:foodItemId/units", async (c) => {
    const safeUserId = c.userId!;
});
