/* eslint-disable no-undef */
const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");

puppeteer.use(StealthPlugin());
const fs = require("fs");
urlAnime = "https://animedao.to/anime/life-with-an-ordinary-guy-who-reincarnated-into-a-total-fantasy-knockout/";
animepath = __dirname + "/";

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
		devtools: true

	});

	const page = await browser.newPage();
	const now = Date.now();

	await page.goto(urlAnime, {
		timeout:0,
		waitUntil: "load"
	});
	const hasCloudflare = async () => {
		return await page.evaluate(async () => {
			if (document.title === "Just a moment...") return true;
			return false;
		});
	};
	const cancelCloudflare = async () => {
		if (await hasCloudflare() === true){
			await await page.reload({ waitUntil: ["networkidle0", "domcontentloaded"] });
			console.log("shit.");
	
			
			if (await hasCloudflare() === true) {
				await page.waitForTimeout(5500);
				await cancelCloudflare();
			}
		}
		return;
	};
	await cancelCloudflare();

	let res = await page.evaluate(async (now) => {
		
		let resClient = {
			time: now,
			module: "animedao"
		};
		resClient["name"] = document.querySelector(".col-lg-8 > h2:nth-child(1) > b:nth-child(1)").innerText;
		const names = [
			resClient["name"]
		];
		const alt = document.querySelector(".col-lg-8").innerText.match(/Alternative: ((?:[^,\r\n]*,?)*)/);
		if (alt !== null) alt[1].split(", ").forEach(e => names.push(e));

		resClient["tags"] = [...document.getElementsByClassName("animeinfo_label")]
			.map (e => e.innerText) //only tags
			.map (e => e.replace(/ $/, "")); // remove trailing space

		resClient["ep"] = {};
		document.querySelectorAll("html.no-js body div.container.content div.row div.tab-content div#eps.tab-pane.fade.active.in div.col-sm-6 a.episode_well_link").forEach(e => {
			let name = e.title;
			names.forEach(n => name = name.replace(new RegExp(" ?" + n + " ?"), ""));
			name = name.match(/[0-9.,]*(?: Final|)$/g)[0].match(/[0-9.,]*/)[0];
			resClient["ep"][name] = {
				url : e.href,

			};
		});
		const status = document.querySelector(".col-lg-8").innerText.match(/Status: ([^\r\n]*)/);
		if (status !== null) resClient["status"] = status[1];
		const release = document.querySelector(".col-lg-8").innerText.match(/Year: ([^\r\n]*)/);
		if (release !== null) resClient["release"] = release[1];

		return resClient;
	}, now);
	await browser.close();
	res["path"] = res["name"].replace(/(?![A-Za-z0-9 ])./g, "") + " (SRC animedao)";

	if (!fs.existsSync(animepath + res["path"] + "/")) fs.mkdirSync(animepath + res["path"] + "/");
	fs.writeFileSync(animepath + res["path"] + "/config.json", JSON.stringify({
		link : urlAnime,
		tags : res["tags"],
		lastChecked : res["now"],
		releaseDate : res["release"],
		currentStatus : res["status"],
		currentEpisodes: Object.keys(res["ep"])

	}), "utf-8");

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