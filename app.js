const http = require("http");
const fs = require("fs");

function listen (port){
	app.listen(port, "localhost");
}
function event ([...args]){
	io.emit(args);
}
let downloader;
function SetDownloader (arg){
	downloader = arg;
}
let tracer;
function SetTracer (arg){
	tracer = arg;
}

const app = http.createServer((req, res)=> {
	const url = new URL(req.url, `http://${req.headers["host"]}${req.url ?? "/"}`);

	switch (url.pathname) {
	case "/":{
		res.writeHead(200);
		res.write(fs.readFileSync(__dirname + "/web/html/index.html"));
		res.end();
		break;
	}
	case "/browse":{
		res.writeHead(200);
		res.write(fs.readFileSync(__dirname + "/web/html/browse.html"));
		res.end();
		break;
	}
	case "/video":{
		if (url.searchParams.has("file")
		&& url.searchParams.has("anime")){
			const file = url.searchParams.get("file");
			const anime = Buffer.from (url.searchParams.get("anime"), "base64").toString();
			const path = global.config.anime.path + anime + "/" + file;
			console.log(path);
			if (fs.existsSync(path)){
				res.writeHead(200);
				res.write(fs.readFileSync(path));
				res.end();
			}else{
				res.writeHead(400);
				res.write("not found");
				res.end();
			}
			return;
		}
		res.writeHead(400);
		res.write("File ou anime search parameter missing.");
		res.end();
		break;
	}
	case "/downloads":{
		res.writeHead(200);
		res.write(fs.readFileSync(__dirname + "/web/html/download list.html"));
		res.end();
		break;
	}
	default:{
		res.writeHead(404);
		res.end("");
		break;
	}
	}

});

const io = require("socket.io")(app);

//SECTION download
const download = io.of("/download");
setInterval(() => {
	download.emit("status", downloader["DownloadList"]);
}, 1000);

download.on("connect", socket => {

	socket.on("add", obj=> {
		console.log("Socket asked to download");
		const url = obj.url;
		const fileName = obj.filename;
		const module = obj.module;
		const info = obj.info;
		const path = obj.path;
		downloader.downloadEP(url, module, path, fileName, info);
	});
	socket.on("trace", obj => {
		tracer.trace(obj.url, obj.module).then(result => {
			socket.emit("tracer", result);
		}).catch(console.error);
	});
	socket.on("stop", id => {
		if (typeof id !== "string") return socket.emit("stop", "ID invlid");

		downloader.stop(id).then(result => {
			socket.emit("stop", result);
			socket.emit("status", downloader["DownloadList"]);
		}).catch(result => {
			socket.emit("stop", result);
			socket.emit("status", downloader["DownloadList"]);
		});
	});
	console.log("Socket connected");
});
//!SECTION


//SECTION browse
const browse = io.of("/browse");
let AnimeCache = {};
function refreshAnimeCache(){
	fs.readdirSync(global.config.anime.path).filter(file => 
		fs.statSync(global.config.anime.path + file).isDirectory()
	)
		.sort((a,b)=> {
			return a.toLowerCase().localeCompare(b.toLowerCase());
		})
		.forEach(anime => {
			const animeDir = global.config.anime.path + anime + "/";
			let animeName = anime.replace(/ \(SRC [A-z]+\)/g, "");
			if (AnimeCache[animeName] !== undefined) animeName = anime;

			let module;
			if (anime.match (/\(SRC ([A-z]+)\)/) !== null)
				module = anime.match (/\(SRC ([A-z]+)\)/)[1];

			let config = {};

			if (fs.existsSync(animeDir + "config.json")){
				try {
					config = JSON.parse(fs.readFileSync(animeDir + "config.json"));
				} catch (error) {
					config.error = error.toString();
				}
			}else config.error = "No config file found.";

			config["module"] = module;

			config["view"] = anime;

			config.files = fs.readdirSync(animeDir).filter(file => 
				fs.statSync(animeDir+ file).isFile()
			&& !["config.json", "config.yml"].includes(file)
			);

			AnimeCache[animeName] = config;
		});
}
refreshAnimeCache();

browse.on("connect", socket => {
	socket.emit("message", "Welcome");
	socket.on("list", () => {
		refreshAnimeCache();
		socket.emit("list", JSON.stringify(AnimeCache));
	});
});


//!SECTION 

module.exports = {
	listen,
	event,
	SetDownloader,
	SetTracer
};