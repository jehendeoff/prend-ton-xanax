const cluster = require("cluster");

let DownloadList = {
	errored: {
		size: 0
	},
	finished: {
		size: 0
	},
	working: {
		size: 0
	},
	waiting: {
		size: 0
	},
};

let event = ()=> {};
function ChangeEvent(fn){event = fn;}

function downloadEP (site, module, path, fileName, info){
	let where = Math.random().toString().slice(2);
	if (path) path = global.config.animePath + path + "/";
	else path = global.config.animePath + "Unknown/";


	while(DownloadList["errored"][where] !== undefined
	&& DownloadList["finished"][where] !== undefined
	&& DownloadList["working"][where] !== undefined
	&& DownloadList["waiting"][where] !== undefined){
		where = Math.random().toString().slice(2);
	}
	let current = "waiting";

	DownloadList[current]["size"]++;
	function remove () {
		setTimeout(()=> {
			DownloadList[current][where] = undefined;
			DownloadList[current]["size"]--;
		}, 10000);
	}
	DownloadList[current][where] = {
		status: "Waiting",
		percent: "",
		path: path,
		site: module,
		filename: fileName,
		speed: "",
		size : {
			downloaded: "",
			total : ""
		},
		stopping: false,
		stop: () => {return new Promise((r,j)=> j(where + "\tError"));},
		info: info,
	};

	function run(){
		DownloadList["working"][where] = DownloadList[current][where];
		DownloadList["working"]["size"]++;
		DownloadList[current][where] = undefined;
		DownloadList[current]["size"]--;
		current = "working";

		const location = __dirname +"/downloader/" + DownloadList[current][where]["site"] + ".js";
		cluster.setupPrimary({
			exec: location,
			silent: true,
		});
		const download = cluster.fork({
			chromePath: global.config.puppeteer?.chromePath ?? "",
			preferLanguage :  global.config.anime?.prefer?.language ?? "",
		});
		function error(){
			if (current !== "errored"){
				DownloadList["errored"][where] = DownloadList[current][where];
				DownloadList["errored"]["size"]++;
				DownloadList[current][where] = undefined;
				DownloadList[current]["size"]--;
				current = "errored";
			}
		}
		function end(){
			if (current !== "finished"){
				DownloadList["finished"][where] = DownloadList[current][where];
				DownloadList["finished"]["size"]++;
				DownloadList[current][where] = undefined;
				DownloadList[current]["size"]--;
				current = "finished";
			}
		}

		DownloadList[current][where]["stop"] = ()=> {
			return new Promise((r,j)=> {
				DownloadList[current][where]["stopping"] = true;
				error();
				remove();
				if (download.isConnected()){
					download.on("error", ()=> {
						j(where + "\tDownloader isn't responding, we are killing it.");
						download.process.kill();
					});
					download.on("exit", ()=> {
						return r(where + "\tDownloader has been stopped!");
					});
					download.send("stop");
				}
			});
		};
		download.send("url\r\n" + site);
		if (path) download.send("path\r\n" + path);
		if (fileName) download.send("filename\r\n" + fileName);
		download.send("download\r\n");
		if(fileName == undefined) fileName = "Unknown " + Math.random().toString().slice(2);

		DownloadList[current][where]["filename"] = fileName;
		download.on("message", message => {
			console.log(message);
			if (message.includes(":") && !message.startsWith("Download: ")) DownloadList[current][where]["status"] = message;
			if (typeof message !== "string") return;
			if (message.startsWith ("Looking: ") && message.includes("F:")){
				fileName = Buffer.from(message.match(/F:([^ ]*)/g)[0].slice(2), "base64").toString();
				DownloadList[current][where]["filename"] = fileName;
			}
			if (message.startsWith("Download: ")){
				message = message.slice("Download: ".length);

				let Current = message.match(/C:[^ ]*/g);
				if (Current!== null) Current = Current[0].slice(2);
				DownloadList[current][where]["size"]["downloaded"] = Current;

				let Total = message.match(/T:[^ ]*/g);
				if (Total!== null) Total = Total[0].slice(2);
				DownloadList[current][where]["size"]["total"] = Total;

				let Percent = message.match(/P:[^ ]*/g);
				if (Percent!== null) Percent = Percent[0].slice(2);
				DownloadList[current][where]["percent"] = Percent;

				let Speed = message.match(/S:[^ ]*/g);
				if (Speed!== null) Speed = Speed[0].slice(2);
				DownloadList[current][where]["speed"] = Speed;
			}
			event(message);
		});
		download.on("error", () => {
			console.error("could not talk to worker");
		});
		download.on("exit", (code, signal)=> {
			if (signal) {
				console.log(`worker was killed by signal: ${signal}`);
				error();
			} else if (code !== 0) {
				console.log(`worker exited with error code: ${code}`);
				error();
			} else {
				console.log("worker success!");
				end();
			}
		});
	}
	function isready (){
		if(DownloadList["working"].size <global.config.downloader?.simultaneous ?? 2){
			clearInterval(interval);
			run();
		}
	}
	const interval = setInterval(isready, 500);
}
function getID(id){
	if (DownloadList["working"][id] !== undefined) return "working";
	if (DownloadList["waiting"][id] !== undefined) return "waiting";
	if (DownloadList["finished"][id] !== undefined) return "finished";
	if (DownloadList["errored"][id] !== undefined) return "errored";
	return undefined;
}
function stop(id){
	return new Promise((r,j)=> {
		const where = getID(id);
		if (where === undefined) return "ID could not be found !";
		if (DownloadList[where][id]["stop"] !== undefined){
			DownloadList[where][id]["stop"]().then (r).catch(j);
		}

	});
}
module.exports = {
	downloadEP,
	DownloadList,
	ChangeEvent,
	stop
};