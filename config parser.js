const fs = require("fs");
const yaml= require("yaml");
const configPath = __dirname + "/config.yml";
if(!fs.existsSync(configPath)){
	throw new Error("Something's wrong, the \"config.yml\" file is missing.\n\n");
}
global.config = yaml.parse(fs.readFileSync("./config.yml", "utf-8"));

let updated = false;
//ANCHOR update old config 
if (global.config.animePath !== undefined
&& global.config.anime.path === undefined){
	console.warn("Found old config `animePath`, replacing it with `anime.path`.\t(config.yml => anime.path)");
	global.config.anime.path = global.config.animePath;
	delete global.config.animePath;
	updated = true;
}


//ANCHOR make new config if none exists
if (global.config.anime.path === undefined){
	global.config.anime.path = __dirname + "/anime/";
	console.warn("Did not found any anime path in config, making one.\t(config.yml => anime.path)");
	if (!fs.existsSync(global.config.anime.path)) 
		fs.mkdirSync(global.config.anime.path);
	updated = true;
}
if (global.config.app.port === undefined){
	global.config.app.port = 10410;
	console.warn("Did not found any port in config, using 10410.\t(config.yml => app.port)");
	updated = true;
}
if (global.config.app.cookie === undefined){
	global.config.app.cookie = __dirname + "/cookie/";
	console.warn("Did not found any app cookie path in config, making one.\t(config.yml => app.cookie)");
	if (!fs.existsSync(global.config.app.cookie)) 
		fs.mkdirSync(global.config.app.cookie);
	updated = true;
}


if (updated === true) fs.writeFileSync(configPath, yaml.stringify(global.config));


if (!fs.existsSync(global.config.anime.path)) throw new Error("Anime path is unavailable.\t(config.yml => anime.path)");

if (!global.config.puppeteer?.chromePath){
	if (!global.config.puppeteer) global.config.puppeteer = {};
	const localChromeium =  __dirname+"/node_modules/puppeteer/.local-chromium/";
	const version = fs.readdirSync(localChromeium).filter(file => 
		fs.statSync(localChromeium+file).isDirectory() 
		&& fs.readdirSync(localChromeium+file).filter(folder => folder.includes("chrome")).length >0
	)[0] + "/";
	const os = fs.readdirSync(localChromeium + version).filter(file => fs.statSync(localChromeium+version+file).isDirectory())[0] + "/";
	const chromeExec = fs.readdirSync(localChromeium + version + os)
		.filter(file => file.replace(/.[A-z0-9]+?$/, "") === "chrome")
		.sort((a,b)=>{
			const aExe = a.endsWith(".exe");
			const bExe = b.endsWith(".exe");
			if (aExe === true 
		&& bExe === true) return 0;
			if (aExe === true) return -1;
			if (bExe === true) return 1;
			return 0;
		});
	global.config.puppeteer.chromePath =localChromeium + version + os + chromeExec[0];
} 