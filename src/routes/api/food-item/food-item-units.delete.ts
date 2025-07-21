import foodItem from "./food-item.create";

foodItem.delete("/:foodItemId/units/:unitId", async (c) => {
    const userId = c.userId!;
});
