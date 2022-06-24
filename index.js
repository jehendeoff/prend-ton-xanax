
const downloader = require("./downloader");
const tracer = require("./tracer");
const app = require("./app");
const fs = require("fs");
const yaml= require("yaml");
if(!fs.existsSync("./config.yml")){
	throw new Error("Something's wrong, the \"config\" file is missing.\n\n");
}
global.config = yaml.parse(fs.readFileSync("./config.yml", "utf-8"));

if (!fs.existsSync(global.config.animePath)) throw new Error("AnimePath is unavailable.");
if (!global.config.puppeteer?.chromePath){
	if (!global.config.puppeteer) global.config.puppeteer = {};
	const localChromeium =  __dirname+"/node_modules/puppeteer/.local-chromium/";
	const version = fs.readdirSync(localChromeium)[0] + "/";
	const os = fs.readdirSync(localChromeium + version)[0] + "/";
	global.config.puppeteer.chromePath =localChromeium + version + os + "chrome";
} 
if (!fs.existsSync(__dirname + "/cookies/")) fs.mkdirSync(__dirname + "/cookies/");
app.listen(global.config.app.port ?? 10410);
app.SetDownloader(downloader);
app.SetTracer(tracer);
