const fs = require("fs");
const constant = require("./functions/const");

fs.readdirSync(global.config.anime.path).filter(file =>
	fs.statSync(global.config.anime.path + file).isDirectory()
)
.sort((a,b)=> {
	return a.toLowerCase().localeCompare(b.toLowerCase());
})
.forEach(anime => {
	const animeDir = global.config.anime.path + anime + "/";
	let animeName = anime.replace(/ \(SRC [A-z0-9-+_]+\)/g, "");

	let module;
	if (anime.match(/\(SRC ([A-z]+)\)/) !== null)
		module = anime.match (/\(SRC ([A-z]+)\)/)[1];

	let config = {};

	if (fs.existsSync(animeDir + "config.json")){
		try {
			config = JSON.parse(fs.readFileSync(animeDir + "config.json"));
		} catch (error) {
			config.error = error.toString();
		}
	}else config.error = "No config file found.";

	if (config.error) return
	if (!config["name"]) return;

	if (constant.CorrectFileName(config["name"]) !== animeName){
		const newDir = global.config.anime.path + constant.CorrectFileName(config["name"]) + ` (SRC ${module})/`;
		console.warn(`Renaming folder ${animeDir} to ${newDir}`);
		fs.renameSync(animeDir, newDir);
		console.warn("\tSuccess.");

	}




});