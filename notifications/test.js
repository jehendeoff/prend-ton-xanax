const webpush = require("web-push");
const yaml = require("yaml");
const fs = require("fs");
let config = fs.readFileSync(__dirname + "/../config.yml", "utf-8");
config = yaml.parse(config);
const vapid = config.app.notification;

const private = vapid.privateKey;
const public = vapid.publicKey;

webpush.setVapidDetails("mailto:jehende@jehende.fr", public,private);

const subs = JSON.parse(fs.readFileSync(__dirname + "/../notifications list.json", "utf-8"));
console.log(subs);
(async ()=> {

	for (let i = 0; i < subs.length; i++) {
		const sub = subs[i];
		await webpush.sendNotification(sub, JSON.stringify({
			title: "test titre",
			body: "test body",
			icon: "https://cdn.discordapp.com/avatars/474113083506425861/7809cd037e90f8ce077cf8715039a090.png?size=1024"
		})).catch(err => {
			console.error(err);
			if (err.body){
				try {
					const bod = JSON.parse(err.body);
					if (bod.error === "Gone"){
						subs.splice(i,1);
						console.error("removing a sub from notification list (no longer used)");
					}
				} catch {
					console.error(err);
					return;
				}
			}else
				console.error(err);
		});
	}
	fs.writeFileSync(__dirname + "/../notifications list.json", JSON.stringify(subs));

})();
