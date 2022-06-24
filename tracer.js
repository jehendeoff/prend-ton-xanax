const cluster = require("cluster");

function trace (site, module, ){
	return new Promise((res, rej)=> {
		cluster.setupPrimary({
			exec: __dirname +"/tracer/" + module + ".js",
			silent: true
		});

		const download = cluster.fork({
			chromePath: global.config.puppeteer?.chromePath ?? ""
		});
		download.send("url\r\n" + site);
		download.send("look\r\n");
		if(global.config.animePath) download.send("animepath\r\n" + global.config.animePath);

		download.on("message", m => res(m));
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