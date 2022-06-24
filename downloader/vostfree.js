
/* eslint-disable no-undef */
const puppeteer = require("puppeteer");
const { DownloaderHelper } = require("node-downloader-helper");
const fs = require("fs");

urlAnime = "https://vostfree.tv/213-black-butler-saison-1-vf-ddl-streaming-1fichier-uptobox.html";
path = __dirname;
fileNameEP = undefined;

process.on("message", async (msg) => {
	if (msg === "stop"){
		console.log("hey, stop");
		if (dl) {
			console.log("stopping download");
			fs.unlinkSync(dl.getDownloadPath());
			dl.stop();
		}
		process.exit(1);
	}
	const resp = msg;
	if (resp.split(/\r\n/g)[0] === "download"){
		const canvas = await all();
		process.send(canvas);

		process.exit(0);
	}
	if (resp.split(/\r\n/g)[0] === "url") urlAnime = resp.split(/\r\n/g)[1];
	if (resp.split(/\r\n/g)[0] === "path") path = resp.split(/\r\n/g)[1];
	if (resp.split(/\r\n/g)[0] === "filename") fileNameEP = resp.split(/\r\n/g)[1];

});




async function scrape ()  {
	const browser = await puppeteer.launch({
		executablePath: process.env["chromePath"],
		headless: false,
		//devtools: true

	});

	const page = await browser.newPage();

	process.send("Looking: Going to Vostfree.tv");
	await page.goto(urlAnime, {
		timeout:0
	});

	process.send("Looking: Trying to see if player is compatible.");
	await page.evaluate(async () => {

		console.clear = () => {};
		console.error("here");
		//debugger;
		if(document.location.hash !== ""){
			if (document.location.hash.startsWith("#Episode=")){
				const ep = atob(document.location.hash.slice("#Episode=".length));
				const clickable = [...document.querySelectorAll("#player-tabs > div.tab-blocks > div:nth-child(1) > div > div.new_player_top > div.new_player_selector_box > div.jq-selectbox-wrapper > div > div.jq-selectbox__dropdown > ul > li")]
					.filter(e => e.innerText === ep);
				clickable[0].click();

			}
		}


		const player = document.getElementById("film_iframe");

		if (player) {
			console.log("player is available.", player);

		} else {
			console.log("The player isn't available.");

		}
		await sleep(2000);

		function sleep(ms) {
			return new Promise(resolve => {
				setTimeout(resolve, ms);
			});
		}
		await sleep(2000);

		return player.src;

	});
	process.send("Looking: player detected, getting video file");
	const frameHandler = await page.$("#film_iframe");
	const frame = await frameHandler.contentFrame();
	browser.on("targetcreated", async (target)=>{
		const page = await target.page();
		console.log("Looking: closing a popup");
		if(page) page.close();
	});
	const video = await frame.evaluate(async fileNameEP => {

		const link = document.createElement("a");
		const u = document.getElementById("video_html5_wrapper_html5_api").src;
		link.setAttribute("href", u);
		link.setAttribute("download", document.getElementsByTagName("title")[0].innerText);
		link.setAttribute("id", "video_download_link");
		document.body.appendChild(link);

		link.click();

		return {
			name: fileNameEP ?  fileNameEP + u.match (/\.[^.]*$/)[0] : u.match(/\/[^/]*$/)[0].replace("/", ""),
			url: u,
		};


	}, fileNameEP);
	console.log(video);
	await frame.waitForNavigation({
		//timùeout: 0,
	});
	//await frame.click("#video_download_link");
	process.send("Looking: Got video File launching download. F:" + Buffer.from(video.name).toString("base64"));
	const urlVideo = await frame.evaluate(() => {
		return document.location.href || document.getElementsByTagName("video")[0].src || document.getElementsByTagName("video")[0].children[0].src;
	});
	process.send("Looking: Video url is : " + urlVideo);

	await page.close();

	await browser.close();

	return {
		url : urlVideo,
		name : video.name
	};
}
let dl;
function download(url, name){
	return new Promise(r => {
		if (!fs.existsSync(path)) fs.mkdirSync(path);
		dl = new DownloaderHelper(url, path, {
			fileName: name,
			headers: {
				"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/71.0.3578.98 Safari/537.36",
				"Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
				"Accept-Language": "en-US,en;q=0.5",
				"Accept-Encoding": "gzip, deflate, br",
				"DNT": "1",
				"Connection": "keep-alive",
				"Upgrade-Insecure-Requests": "1",
				"Sec-Fetch-Dest": "document",
				"Sec-Fetch-Mode": "navigate",
				"Sec-Fetch-Site": "cross-site",
				"Sec-GPC": "1",
				"Pragma": "no-cache",
				"Cache-Control": "no-cache",
				"TE": "trailers",
				"Range":"bytes=0-",
			}
		});

		process.send("Download: start");

		dl.on("end", () => {
			console.log("Download Completed");
			process.send("Download: end");
			r();
			dl = undefined;
		});
		dl.on("progress.throttled", stats => {
			process.send(`Download: stats P:${stats.progress}% S:${stats.speed / 1000}KB/S T:${stats.total /1000}KO C:${stats.downloaded /1000}KO`);
		});
		dl.on("error", error => {
			process.send("Download: error e:" + error);
		});
		dl.start();
	});

}

async function all(){
	const video = await scrape();
	//if (fileNameEP) video.name = fileNameEP + video.name.match (/\.[^.]*$/)[0];
	await download(video.url, video.name);
	return "finished";
}
//download("https://www1300.ff-03.com/token=LzWTylSUECdeMx4MgVGIvA/1643839511/2a01:e34::/186/0/8f/ad06976151c51dc1dbc4f306fc80d8f0-480p.mp4", "test.mp4");