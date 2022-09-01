/* eslint-disable no-undef */
const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const cloudflareBypasser = require("../puppeteer functions/cloudflare bypasser");
const cookiesFunc = require("../puppeteer functions/cookies");
puppeteer.use(StealthPlugin());
const fs = require("fs");
const constant = require("../functions/const");

var urlAnime = "https://animedao.to/anime/life-with-an-ordinary-guy-who-reincarnated-into-a-total-fantasy-knockout/";
var animepath = __dirname + "/";

process.on("message", async (msg) => {
	const resp = msg;
	if (resp.split(/\r\n/g)[0] === "look"){
		const canvas = await scrape();
		process.send(JSON.stringify(canvas));

		process.exit(0);
	}
	if (resp.split(/\r\n/g)[0] === "url") urlAnime = resp.split(/\r\n/g)[1];
	if (resp.split(/\r\n/g)[0] === "animepath") animepath = resp.split(/\r\n/g)[1];
});




async function scrape ()  {

	const browser = await puppeteer.launch({
		executablePath: process.env["chromePath"],
		headless: false,
		//devtools: true

	});

	const page = await browser.newPage();
	const now = Date.now();
	const cookiesStart = cookiesFunc.loadCookies("animedao", cookiesFunc.createCookie("darkmode", "1", "animedao.to"));
	await page.setCookie(...cookiesStart);


	await page.goto(urlAnime, {
		timeout:0,
		waitUntil: "load"
	});
	await cloudflareBypasser.cancelCloudflare(page);
	let res = await page.evaluate(async (now) => {

		let resClient = {
			lastChecked: now,
			module: "animedao"
		};
		resClient["name"] = document.querySelector(".col-lg-8 > div:nth-child(2) > h2:nth-child(1) > b:nth-child(1)").innerText;
		const names = [
			resClient["name"]
		];
		resClient["image"] = document.querySelector(".main-poster").hasAttribute("data-src") ? document.querySelector(".main-poster").getAttribute("data-src") : document.querySelector(".main-poster").src;

		resClient["posterB64"] = await (async () =>{
			const response = await fetch(resClient["image"]);
			const blob = await response.blob();
			return await (()=> {
				return new Promise((onSuccess, onError) => {
					try {
						const reader = new FileReader() ;
						reader.onload = function(){ onSuccess(this.result); } ;
						reader.readAsDataURL(blob) ;
					} catch(e) {
						onError(e);
					}
				});
			})();
		})();
		const alt = document.querySelector(".table > tbody:nth-child(1) > tr:nth-child(2) > td:nth-child(2)").innerText;
		if (alt !== null) alt.split(", ").forEach(e => names.push(e));

		const relations = document.querySelector("div.row:nth-child(7)").children;
		const prequel = relations[0];
		if (prequel.children.length !== 0)
			resClient["prequel"] = {
				name: prequel.querySelector("span.animename:nth-child(2) > b:nth-child(1)").innerText,
				url : prequel.querySelector("div.animeposter:nth-child(1) > div:nth-child(1) > a:nth-child(1)").href,
			};
		const sequel = relations[1];
		if (sequel.children.length !== 0)
			resClient["sequel"] = {
				name: sequel.querySelector("span.animename:nth-child(2) > b:nth-child(1)").innerText,
				url : sequel.querySelector("div.animeposter:nth-child(1) > div:nth-child(1) > a:nth-child(1)").href,
			};

		resClient["tags"] = [...document.querySelectorAll("body > div.container.main-container.min-vh-100.px-3 > div > div.row.mt-2.mb-1 > div > div > div > div > div.col-lg-8.px-4.py-3 > table > tbody > tr:nth-child(6) > td > a")]
			.map (e => e.innerText); //only tags
		//.map (e => e.replace(/ $/, "")); // remove trailing space

		resClient["ep"] = {};
		document.querySelectorAll("html body.d-flex.flex-column.min-vh-100 div.container.main-container.min-vh-100.px-3 div._animeinfo div.row div.tab-content.mt-2 div#episodes-tab-pane.tab-pane.fade.show.active div.row div.col-sm-6 div.card.rounded-0").forEach(e => {
			const isSpecial = e.querySelector(".special") !== null;

			let name = e.children[0].title;
			if (isSpecial){
				const prefix = e.querySelector(".special").innerText;
				name = prefix + " - " + name;
			}else{
				names.forEach(n => name = name.replace(new RegExp(" ?" + n + " ?"), ""));
				name = name.match(/[0-9.,]*(?: ?Final)?(?: ?\[Uncensored\])? ?$/g)[0].match(/[0-9.,]*/)[0];
				if (name ==="") name = e.title;
			}
			name = name.replace(/[/\\*?"<>|:]/g, "");
			debugger
			resClient["ep"][name] = {
				url : e.children[0].href,

			};
		});
		const status = document.querySelector(".table > tbody:nth-child(1) > tr:nth-child(5) > td:nth-child(2)").innerText;
		if (status !== null) resClient["currentStatus"] = status;
		const release = document.querySelector(".table > tbody:nth-child(1) > tr:nth-child(4) > td:nth-child(2)").innerText;
		if (release !== null) resClient["releaseDate"] = release;

		return resClient;
	}, now);
	//We want to close as soon as possible to prevent using the cpu
	const cookiesEnd = await page.cookies();
	await cookiesFunc.saveCookies("animedao", cookiesEnd);
	await browser.close();

	res["path"] = constant.CorrectFileName(res["name"]) + " (SRC " + __filename/*yes, i know this is bad*/.replace(/.*[/\\]/g, "").replace(/\.js$/, "") + ")";
	const animeDir = animepath + res["path"] + "/";
	res["link"] = urlAnime;
	res["currentEpisodes"] = Object.keys(res["ep"]);

	if (!fs.existsSync(animeDir)) fs.mkdirSync(animeDir);
	res["files"] = fs.readdirSync(animeDir).filter(file =>
		fs.statSync(animeDir+ file).isFile()
		&& !["config.json", "config.yml"].includes(file)
	);


	fs.writeFileSync(animeDir +"config.json", JSON.stringify(res), "utf-8");


	//should be abandoned
	for (const key in res["ep"]) {
		let e = res["ep"][key];
		const epPath = animepath + res["path"] + "/" + key.match(/[0-9.]*$/g)[0];
		if (fs.existsSync(epPath + ".mp4")) e["downloaded"] = true;
		if (fs.existsSync(epPath + ".avi")) e["downloaded"] = true;
		if (fs.existsSync(epPath + ".mkv")) e["downloaded"] = true;
		if (e["downloaded"] !== true) e["downloaded"] = false;
	}


	return res;
}