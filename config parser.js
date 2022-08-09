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
if (global.config.anime === undefined) global.config.anime = {};
if (global.config.anime.path === undefined
|| global.config.anime.path === null){
	global.config.anime.path = __dirname + "/anime/";
	console.warn("Did not found any anime path in config, making one.\t(config.yml => anime.path)");
	if (!fs.existsSync(global.config.anime.path))
		fs.mkdirSync(global.config.anime.path);
	updated = true;
}
if (global.config.anime.prefer === undefined) global.config.anime.prefer = {};

if (global.config.app.port === undefined
|| global.config.app.port === null){
	global.config.app.port = 10410;
	console.warn("Did not found any port in config, using 10410.\t(config.yml => app.port)");
	updated = true;
}
if (global.config.app.cookie === undefined
|| global.config.app.cookie === null){
	global.config.app.cookie = __dirname + "/cookie/";
	console.warn("Did not found any app cookie path in config, making one.\t(config.yml => app.cookie)");
	if (!fs.existsSync(global.config.app.cookie))
		fs.mkdirSync(global.config.app.cookie);
	updated = true;
}
if (global.config.app["localhost?"] === undefined){
	console.warn("Did not found if you wanted to run only on localhost, defaulting to true.\t(config.yml => app.localhost?)");
	global.config.app["localhost?"] = true;
	updated = true;
}

if (global.config.tracer === undefined)global.config.tracer = {};
if (global.config.tracer.cache === undefined)global.config.tracer.cache = {};
if (global.config.tracer.cache.timeDifference === undefined
|| global.config.tracer.cache.timeDifference === null){
	global.config.tracer.cache.timeDifference = 3600;
	console.warn("Did not found the amount of time to cache the tracer's response, defaulting to 3600 seconds.\t(config.yml => tracer.cache.timeDifference)");
	updated = true;
}

if (!global.config.puppeteer?.chromePath){
	console.warn("did not found any chrome executable ine the config file, trying to default to one.\t(config.yml => puppeteer => chromePath)");
	if (!global.config.puppeteer) global.config.puppeteer = {};
	const localChromeium =  __dirname+"/node_modules/puppeteer/.local-chromium/";
	const version = fs.readdirSync(localChromeium).filter(file =>
		fs.statSync(localChromeium+file).isDirectory()
		&& fs.readdirSync(localChromeium+file).filter(folder => folder.includes("chrome")).length >0
	)[0] + "/";
	const os = fs.readdirSync(localChromeium + version).filter(file => fs.statSync(localChromeium+version+file).isDirectory())[0] + "/";
	let chromeExec = fs.readdirSync(localChromeium + version + os)
		.filter(file => file.replace(/\.[A-z0-9]+?$/, "") === "chrome");
	switch (process.platform) {
	case "win32":{
		chromeExec = chromeExec.sort((a,b)=>{
			const aExe = a.endsWith(".exe");
			const bExe = b.endsWith(".exe");

			if (aExe === true
			&& bExe === true) return 0;

			if (aExe === true) return -1;
			if (bExe === true) return 1;
			return 0;
		});
		break;
	}

	default:{
		break;
	}
	}
	global.config.puppeteer.chromePath =localChromeium + version + os + chromeExec[0];
	updated = true;
}


if (updated === true) fs.writeFileSync(configPath, yaml.stringify(global.config));


if (!fs.existsSync(global.config.anime.path)) throw new Error("Anime path is unavailable.\t(config.yml => anime.path)");
if (!fs.existsSync(global.config.app.cookie)) throw new Error("Cookies path is unavailable.\t(config.yml => app.cookie)");
