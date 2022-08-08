const cluster = require("cluster");
const fs = require("fs");
let traceCache = {};
fs.readdirSync(global.config.anime.path).filter(anime =>
	fs.statSync(global.config.anime.path + anime).isDirectory()
	//only go through those that have a config file, since we'd already trace them
	&& fs.existsSync(global.config.anime.path + anime + "/config.json")
	&& fs.statSync(global.config.anime.path + anime + "/config.json").isFile()
).forEach(anime => {
	const AnimePath = global.config.anime.path + anime +"/";
	let config = JSON.parse(fs.readFileSync(AnimePath + "config.json"));
	if (!config.link) return; // we can't do anything without it
	if (!config.module) config.module = config.link.match(/https?:\/\/([^.]*)/)[1];
	config.files = fs.readdirSync(AnimePath).filter(file =>
		fs.statSync(AnimePath+ file).isFile()
	&& !["config.json", "config.yml"].includes(file)
	);

	if (!traceCache[config.module]) traceCache[config.module] = {};
	traceCache[config.module][config.link] = config;

});

function trace (site, module, ){
	return new Promise((res, rej)=> {
		if (traceCache[module][site] !== undefined){
			const cached = traceCache[module][site];
			if (cached.lastChecked
			&& cached.lastChecked + (global.config.tracer.cache.timeDifference*1000) > Date.now()){ // if the cache is "outdated" TODO : try to find a way to intelligently update (like look for the date of the two last episode, calulate the difference and update only after that time has passed since last episode)
				res(cached);
				return;
			}
		}
		cluster.setupPrimary({
			exec: __dirname +"/tracer/" + module + ".js",
			silent: true
		});

		const download = cluster.fork({
			chromePath: global.config.puppeteer?.chromePath ?? "",
			preferLanguage :  global.config.anime?.prefer?.language ?? "",
			appCookie: global.config.app.cookie,
		});
		download.send("url\r\n" + site);
		download.send("look\r\n");
		if(global.config.anime.path) download.send("animepath\r\n" + global.config.anime.path);

		download.on("message", m =>{
			m = JSON.parse(m);
			if (m.lastChecked) m.lastChecked = Date.now();
			traceCache[module][site] = m;
			res(m);
		});
		download.on("error", () => {
			console.error("could not talk to worker");
		});
		download.on("exit", (code, signal)=> {
			if (signal) {
				rej(`worker was killed by signal: ${signal}`);
			} else if (code !== 0) {
				rej(`worker exited with error code: ${code}`);
			}
		});
	});
}
module.exports = {
	trace,
};