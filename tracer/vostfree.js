/* eslint-disable no-undef */
const puppeteer = require("puppeteer");
const fs = require("fs");
urlAnime = "https://vostfree.tv/213-black-butler-saison-1-vf-ddl-streaming-1fichier-uptobox.html";
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
		headless: true,

	});

	const page = await browser.newPage();
	const now = Date.now();

	await page.goto(urlAnime, {
		timeout:0,
		waitUntil: "load"
	});

	let res = await page.evaluate(async (now, urlAnime) => {
		let resClient = {
			time: now,
			module: "vostfree"
		};
		resClient["name"] = document.querySelector("#dle-content > div.watch-top > div > div > div > div.slide-middle > h1").innerText;

		resClient["tags"] = [...document.querySelector("#dle-content > div.watch-top > div > div > div > div.slide-middle > ul:nth-child(4) > li").children]
			.filter(e => e.href) // only tags
			.map(e => e.innerText); // we want the tag not the html element

		resClient["ep"] = {};
		[...document.querySelectorAll("#player-tabs > div.tab-blocks > div:nth-child(1) > div > div.new_player_top > div.new_player_selector_box > div.jq-selectbox-wrapper > div > div.jq-selectbox__dropdown > ul > li")].forEach (e =>{

			let name = e.innerText.match(/[0-9.,]*$/)[0].replace(/^0/, "");
			resClient["ep"][name] = {
				url : urlAnime + "#Episode=" + btoa(e.innerText),
			};
		});

		//there doesn't seems to be any reasonable way to detect if it has ended
		// const status = document.querySelector(".col-lg-8").innerText.match(/Status: ([^\r\n]*)/);
		// if (status !== null) resClient["status"] = status[1];
		const release = document.querySelector("#dle-content > div.watch-top > div > div > div > div.slide-info > p:nth-child(1) > b > a").innerText;
		if (release !== null) resClient["release"] = release[1];

		return resClient;
	}, now, urlAnime);
	await browser.close();
	res["path"] = res["name"].replace(/(?![A-Za-z0-9 ])./g, "") + " (SRC " + __filename.replace(/\.js$/, "") + ")";

	if (!fs.existsSync(animepath + res["path"] + "/")) fs.mkdirSync(animepath + res["path"] + "/");
	fs.writeFileSync(animepath + res["path"] + "/config.json", JSON.stringify({
		link : urlAnime,
		tags : res["tags"],
		lastChecked : res["now"],
		releaseDate : res["release"],
		currentStatus : undefined, //NOTE we can't find a way
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