
require("./config parser");
require("./upgrade");
const downloader = require("./downloader");
const tracer = require("./tracer");
const app = require("./app");
const port = global.config.app.port ?? 10410;
app.listen(port);
app.SetDownloader(downloader);
app.SetTracer(tracer);

console.log(`Listening to request on http://${global.config.app["localhost?"] !== false ? "localhost" : "127.0.0.1"}:${port}/`);