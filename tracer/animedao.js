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
		resClient["name"] = document.querySelector(".col-lg-8 > h2:nth-child(1) > b:nth-child(1)").innerText;
		const names = [
			resClient["name"]
		];
		const alt = document.querySelector(".col-lg-8").innerText.match(/Alternative: ((?:[^,\r\n]*,?)*)/);
		if (alt !== null) alt[1].split(", ").forEach(e => names.push(e));

		const relations = document.querySelector(".col-lg-8>div.row").children;
		const prequel = relations[0];
		if (prequel.children.length !== 0)
			resClient["prequel"] = {
				name: prequel.querySelector("h5").innerText,
				url : prequel.children[0].href,
			};
		const sequel = relations[1];
		if (sequel.children.length !== 0)
			resClient["sequel"] = {
				name: sequel.querySelector("h5").innerText,
				url : sequel.children[0].href,
			};

		resClient["tags"] = [...document.getElementsByClassName("animeinfo_label")]
			.map (e => e.innerText) //only tags
			.map (e => e.replace(/ $/, "")); // remove trailing space

		resClient["ep"] = {};
		document.querySelectorAll("html.no-js body div.container.content div.row div.tab-content div#eps.tab-pane.fade.active.in div.col-sm-6 a").forEach(e => {
			const isSpecial = e.children[0].children[0].children.length !== 1;
			let name = e.title;
			if (isSpecial){
				const prefix = e.children[0].children[0].children[1].children[0].innerText;
				name = prefix + " - " + name;
			}else{
				names.forEach(n => name = name.replace(new RegExp(" ?" + n + " ?"), ""));
				name = name.match(/[0-9.,]*(?: ?Final)?(?: ?\[Uncensored\])? ?$/g)[0].match(/[0-9.,]*/)[0];
				if (name ==="") name = e.title;
			}
			name = name.replace(/[/\\*?"<>|:]/g, "");
			resClient["ep"][name] = {
				url : e.href,

			};
		});
		const status = document.querySelector(".col-lg-8").innerText.match(/Status: ([^\r\n]*)/);
		if (status !== null) resClient["currentStatus"] = status[1];
		const release = document.querySelector(".col-lg-8").innerText.match(/Year: ([^\r\n]*)/);
		if (release !== null) resClient["releaseDate"] = release[1];

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