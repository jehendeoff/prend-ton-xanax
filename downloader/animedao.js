/* eslint-disable no-undef */
const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const cloudflareBypasser = require("../puppeteer functions/cloudflare bypasser");
const cookiesFunc = require("../puppeteer functions/cookies");
puppeteer.use(StealthPlugin());

const { DownloaderHelper } = require("node-downloader-helper");
const fs = require("fs");

var urlAnime = "https://animedao.to/view/6661668038/";
var animePath = __dirname  +"/";
var fileNameEP = undefined;

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
	if (resp.split(/\r\n/g)[0] === "path") animePath = resp.split(/\r\n/g)[1];
	if (resp.split(/\r\n/g)[0] === "filename") fileNameEP = resp.split(/\r\n/g)[1];

});




async function scrape ()  {
	const browser = await puppeteer.launch({
		executablePath: process.env["chromePath"],
		headless: false,
		//devtools: true

	});

	const page = await browser.newPage();

	const cookiesStart = cookiesFunc.loadCookies("animedao", cookiesFunc.createCookie("darkmode", "1", "animedao.to"));
	await page.setCookie(...cookiesStart);

	//popup blocker
	browser.on("targetcreated", async (target)=> {
		if (target.type() === "page"){
			const page = await target.page();
			await page.goto("about:blank", {
				timeout:0,
				waitUntil: "load",
			});
			await page.close();
		}
	});


	process.send("Looking: Going to Animedao");
	await page.goto(urlAnime, {
		timeout:0,
		waitUntil: "load"
	});

	await cloudflareBypasser.cancelCloudflare(page);

	process.send("Looking: Trying with vcdn");
	const testVCDN = await page.evaluate(async () => {
		[...document.getElementsByTagName("iframe")].filter(iframe => iframe.id !== "").forEach(iframe => iframe.remove());
		console.clear = () => {};
		console.error("here");
		//debugger;

		function sleep(ms) {
			return new Promise(resolve => {
				setTimeout(resolve, ms);
			});
		}
		async function wait() {
			if (document.getElementById("videowrapper_fembed").children.length !== 0) return;
			console.log("We are still clicking vcdn");
			vcdn[0].children[0].click();
			await sleep(1000);
			return await wait();
		}

		const vcdn = [...document.getElementById("videocontent").children[0].children].filter(e => e.innerText.toLowerCase().replace(/ /g, "") === "vcdn");

		if (vcdn && vcdn.length !== 0) {
			console.log("Vcdn is available.", vcdn.length);

			await wait();
			await sleep(2000);
		} else {
			console.log("There vcdn isn't available.");

		}

		await sleep(2000);

		return true;

	});
	if (testVCDN !== true)
		throw new Error(testVCDN);
	process.send("Looking: Vcdn detected, getting video file");
	const frameHandler = await page.$("#videowrapper_fembed > iframe");
	const frame = await frameHandler.contentFrame();
	const video = await frame.evaluate(async (fileNameEP, quality) => {
		console.clear = () => {
			console.log("ptdr tu clear");
		};
		window.open = ()=> {
			console.log("ptdr tu tentes une popup");
		};
		devtoolIsOpening = ()=> {};
		console.log("ptdr tu clear");

		function sleep(ms) {
			return new Promise(resolve => {
				setTimeout(resolve, ms);
			});
		}
		console.log("We are waiting 5 seconds to click.");
		async function wait() {
			if (document.getElementsByClassName("loading-container").length !== 0
			||  document.getElementsByClassName("jwplayer").length !== 0
			||  document.getElementsByTagName("video").length !== 0) return;
			console.log("We are still waiting 1 seconds, no button detected");
			await sleep(1000);
			return await wait();
		}

		await wait();
		document.getElementsByClassName("loading-container")[0].click();

		if (document.getElementsByClassName("jw-error-msg").length !== 0) {
			console.error("JW has encountered an error, we can't download the file!");
			return "vcdn ERROR";
		}

		async function waitv() {
			if (document.getElementsByClassName("jw-video jw-reset").length !== 0) return;
			const nonFirst = [...document.body.children].filter((e,i) => i> 1);
			if (nonFirst.size !== 0){
				const nonFirstDiv = nonFirst.filter(e => e.tagName ==="DIV");
				if (nonFirstDiv.size !== 0){
					const nonFirstDivWithA = nonFirstDiv.filter(e => [...e.children].filter(e => e.tagName ==="A").size !== 0);
					if (nonFirstDivWithA.size !== 0){
						if (nonFirstDivWithA[0]) nonFirstDivWithA[0].click();
						await wait();
					}

				}
			}
			if (document.getElementsByClassName("loading-container").length !== 0) document.getElementsByClassName("loading-container")[0].click();
			console.log("We are still waiting 1 seconds, no video detected");
			await sleep(1000);
			return await waitv();
		}

		await waitv();
		let choosedSource;
		const availableSources = jwplayer().getConfig().playlistItem.allSources.sort((a,b)=> a.label.slice(0,-1) - b.label.slice(0,-1));

		if (availableSources.length === 1){
			choosedSource = availableSources[0];
		}else{
			const preferedSources = availableSources
				.filter(source => parseInt(source.label.slice(0,-1))>=quality);
			if (preferedSources.length === 0){
				choosedSource = availableSources.pop();
			}else{
				choosedSource = preferedSources[0];
			}
		}



		//document.getElementsByClassName("loading-container")[0].click();
		console.log("We are now downloading", document.title);

		const link = document.createElement("a");
		link.setAttribute("href", choosedSource.file);
		link.setAttribute("download", document.title);
		link.setAttribute("id", "video_download_link");
		document.body.appendChild(link);

		link.click();

		return {
			name: fileNameEP ?  fileNameEP + document.getElementsByTagName("title")[0].innerText.match (/\.[^.]*$/)[0] :  document.getElementsByTagName("title")[0].innerText,
			url: choosedSource.file,
			test : document.title
		};


	}, (fileNameEP, process.env["preferedQuality"]));
	console.log(video);
	if (typeof video !== "object")
		throw new Error(video);
	//await frame.click("#video_download_link");
	process.send("Looking: Got video File launching download. F:" + Buffer.from(video.name).toString("base64"));
	const urlVideo = await frame.evaluate(() => {
		return document.getElementsByTagName("video")[0].src || document.getElementsByTagName("video")[0].children[0].src;
	});

	const cookiesEnd = await page.cookies();
	await cookiesFunc.saveCookies("animedao", cookiesEnd);
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
		if (!fs.existsSync(animePath)) fs.mkdirSync(animePath);
		dl = new DownloaderHelper(url, animePath, {
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