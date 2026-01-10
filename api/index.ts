// Import Hono for Vercel framework detection
import "hono";
import { handle } from "hono/vercel";
import { app } from "../src/index";

export default handle(app);
