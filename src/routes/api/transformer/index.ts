import { Hono } from "hono";

export const transformer = new Hono()

transformer.get('/', (c) => {
    return c.text('Flowcore Transformer endpoint')
})

export default transformer