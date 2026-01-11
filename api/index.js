const { handle } = require("hono/vercel");

// `dist/index.js` is produced during Vercel build (see `vercel-build` script).
const { app } = require("../dist/index.js");

module.exports = handle(app);

