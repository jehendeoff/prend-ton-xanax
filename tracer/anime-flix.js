const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const cloudflareBypasser = require("../puppeteer functions/cloudflare bypasser");
puppeteer.use(StealthPlugin());
const fs = require("fs");

const cookiePath = (process.env["appCookie"] ?? __dirname + "/../cookies/") + "anime-flix.json";
var urlAnime = "https://anime-flix.net/series/skeleton-knight-in-another-world/";
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

	});

	const page = await browser.newPage();
	const now = Date.now();
	if (fs.existsSync(cookiePath)){
		const cookiesString = fs.readFileSync(cookiePath, "utf-8");
		const cookies = JSON.parse(cookiesString);
		await page.setCookie(...cookies);
	}

	await page.goto(urlAnime, {
		timeout:0,
		waitUntil: "load"
	});
	await cloudflareBypasser.cancelCloudflare(page);

	let res = await page.evaluate(async (now, urlAnime) => {
		let resClient = {
			lastChecked: now,
			module: "anime-flix"
		};
		resClient["name"] = document.querySelector("#single > div.content.right > div.sheader > div.data > h1").innerText;

		resClient["tags"] = [...document.querySelector("#single > div.content.right > div.sheader > div.data > div.sgeneros").children]
			.filter(e => e.href) // only tags
			.map(e => e.innerText); // we want the tag not the html element

		resClient["ep"] = {};
		[...document.querySelector("#seasons").children].forEach(season=> {
			const episodes = [...[...season.children].filter(ch => ch.classList.contains("se-a"))[0].children[0].children];

			episodes.forEach(ep => {
				let name = [...ep.children].filter(ch => ch.classList.contains("numerando"))[0].innerText;
				name = name.replace(/\/\\\*?"<>\|:/g, "");
				resClient["ep"][name] = {
					url : [...[...ep.children].filter(ch => ch.classList.contains("episodiotitle"))[0].children].filter(ch => ch.tagName === "A" && ch.href)[0].href,
				};
			});

		});
		// [...document.querySelectorAll("#player-tabs > div.tab-blocks > div:nth-child(1) > div > div.new_player_top > div.new_player_selector_box > div.jq-selectbox-wrapper > div > div.jq-selectbox__dropdown > ul > li")].forEach (e =>{

		// 	let name = e.innerText.match(/[0-9.,]*$/)[0].replace(/^0/, "");
		//
		// });

		//there doesn't seems to be any reasonable way to detect if it has ended

		const release = [...document.getElementById("info").children].filter(ch => ch.children.length > 1 && ch.children[0].innerText === "Première date de diffusion")[0].children[1].innerText;
		if (release !== null) resClient["releaseDate"] = release;

		return resClient;
	}, now, urlAnime);
	//we want to close the browser as soon as possible
	const cookies = await page.cookies();
	await fs.writeFileSync(cookiePath, JSON.stringify(cookies));
	await browser.close();


	res["path"] = res["name"].replace(/(?![A-Za-z0-9 ])./g, "") + " (SRC " + __filename.replace(/.*[/\\]/g, "").replace(/\.js$/, "") + ")";
	const animeDir = animepath + res["path"] + "/";
	res["link"] = urlAnime;
	res["currentEpisodes"] = Object.keys(res["ep"]);
	res["files"] = fs.readdirSync(animeDir).filter(file =>
		fs.statSync(animeDir+ file).isFile()
		&& !["config.json", "config.yml"].includes(file)
	);

	if (!fs.existsSync(animeDir)) fs.mkdirSync(animeDir);
	fs.writeFileSync(animeDir +"config.json", JSON.stringify(res), "utf-8");

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