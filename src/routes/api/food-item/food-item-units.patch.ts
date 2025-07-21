import foodItem from "./food-item.create";

foodItem.patch("/:foodItemId/units/:unitId", async (c) => {
    const userId = c.userId!;
});
