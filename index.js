
require("./config parser");
const downloader = require("./downloader");
const tracer = require("./tracer");
const app = require("./app");
app.listen(global.config.app.port ?? 10410);
app.SetDownloader(downloader);
app.SetTracer(tracer);
