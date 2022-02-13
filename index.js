
const downloader = require("./downloader");
const tracer = require("./tracer");
const app = require("./app");
const fs = require("fs");
animePath = "F:/anime/";
if (!fs.existsSync(animePath)) throw new Error("AnimePath is unavailable.");
app.listen(10410);
app.SetDownloader(downloader);
app.SetTracer(tracer);
