import { Hono } from 'hono'

export const app = new Hono()

app.get('/', (c) => {
  return c.text('Hello Hono!')
})

export default {
  port: 3001,
  fetch: app.fetch,
}