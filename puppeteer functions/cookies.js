const fs = require("fs");
function createCookie(name, value, site){
	return {
		name,
		value,
		domain: site,
		path: "/",
		expires: Date.now() + 3600, // valid 1 hour
		size: (name + "=" + value).length,
		httpOnly: false,
		secure: false,
		session: false,
		sameParty: false,
		sourceScheme: "Secure",
		sourcePort: 443
	};
}

function loadCookies (platform, add){
	const cookiePath = (process.env["appCookie"] ?? __dirname + "/../cookies/") + platform + ".json";
	let cookiesString = [];
	if (fs.existsSync(cookiePath)){
		cookiesString = fs.readFileSync(cookiePath, "utf-8");
	}
	cookiesString = JSON.parse(cookiesString);
	cookiesString.push(add);
	return cookiesString;

}
function saveCookies(platform, cookies){
	const cookiePath = (process.env["appCookie"] ?? __dirname + "/../cookies/") + platform + ".json";
	fs.writeFileSync(cookiePath, JSON.stringify(cookies));
}
module.exports = {
	loadCookies,
	saveCookies,
	createCookie
};