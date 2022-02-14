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
	const url = new URL(req.url, `http://${req.headers["host"]}/`);

	switch (url.pathname) {
	case "/":{
		res.writeHead(200);
		res.write(fs.readFileSync(__dirname + "/web/html/index.html"));
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
const download = io.of("/download");

//downloader.ChangeEvent((message => {
//	download.emit("message);
//})

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

module.exports = {
	listen,
	event,
	SetDownloader,
	SetTracer
};