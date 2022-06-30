
const downloader = require("./downloader");
const tracer = require("./tracer");
const app = require("./app");
require("./config parser");
app.listen(global.config.app.port ?? 10410);
app.SetDownloader(downloader);
app.SetTracer(tracer);
