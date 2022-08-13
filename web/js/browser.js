
const bod = document.body;
const extensionRegex = /\.[0-9A-z]+?$/;
if(typeof io === "undefined") {
	document.getElementsByTagName("h1")[0].innerText="Socket.io wasn't able to load.";
	throw new Error("Socket.io wasn't able to load");
}

function changeURL(obj = {
	act: undefined,
}){
	const url = new URL(location.href.replace(location.search, ""));
	for (const key in obj) {
		if (Object.hasOwnProperty.call(obj, key)) {
			url.searchParams.set(key, obj[key]);
		}
	}
	return url.toString();
}
function move(url){
	if (url === location.href) return;
	history.pushState({}, "", url);
}
function removeFromArray(str, array)  {
	const index = array.indexOf(str);
	if (index > -1) { // only splice array when item is found
		array.splice(index, 1); // 2nd parameter means remove one item only
		return true;
	}
	return false;
}


// let lobby =io("/lobby", {
// 	rememberUpgrade : true,
// });
let download =io("/download", {
	rememberUpgrade : true,
});
let cssBackgroundPercent = "linear-gradient(90deg, rgba(0, 0, 0, 0.3) 0%, ${percent}%, rgba(0, 0, 0, 0.1) 0%)";
download.on("status", list => {
	["working", "waiting", "errored", "finished", "downloading"].forEach(Class => {
		[...document.getElementsByClassName(Class)]
			.filter(elem =>
				elem.tagName === "a"
			).forEach(elem => {
				elem.classList.remove(Class);
			});
	});

	for (const type in list) {
		for (const key in list[type]) {
			if (key === "size") continue;
			const element = list[type][key];

			const name = element["info"]?.anime;
			const show = element["info"]?.ep;
			if (document.querySelector("body > div.presentation > h1") !== null
				&& document.querySelector("body > div.presentation > h1").innerText === name){
				const children = [...document.querySelector("body > div.presentation").children]
					.filter(ch => ch.tagName.toLowerCase() === "div")
					.map (e => [...e.children])
					.flat(1);
				const filtered = children.filter (child => child.hasAttribute("view") && child.getAttribute("view") === show);
				if (filtered.length >0){
					filtered.forEach(ep => {
						ep.setAttribute("disabled", true);
						if (type !== "finished"){
							ep.classList.add(type);
							ep.classList.remove("watchable");
							ep.classList.remove("waiting");
							ep.classList.add("downloadable");
							if (type !=="errored"){
								ep.classList.add("downloading");
								ep.setAttribute("disabled", true);
								const percent = (element["percent"] ?? "").slice(0,5);
								ep.style.background = cssBackgroundPercent.replace(/\${percent}/g, percent);
							}else{
								ep.setAttribute("disabled", true);

							}
						}else{
							ep.classList.remove("downloadable");
							ep.classList.remove("downloading");
							ep.classList.remove("working");
							ep.classList.add("watchable");
							ep.setAttribute("disabled", false);
							ep.style.background = "";
						}
					});
				}
			}

		}
	}



});


download.on("connect", ()=> {
	// confirmTracer.disabled = false;
	// inputTracer.disabled = false;
});

download.on("stop", console.log);



//SECTION selector

const selector = document.createElement("div");
selector.classList.add("selector");
bod.appendChild(selector);
function addAnimeToSelector({
	animeName="Unknown",
	onclick=()=> {},
	watched = 0,
	available = 0,
	downloadable=0,
	ref="Unknown"
}){
	const div = document.createElement("div");
	div.onclick = onclick;
	div.setAttribute("Selector_AnimeRef",ref);
	const name = document.createElement("a");
	name.innerText = animeName;
	name.title = animeName;
	div.appendChild(name);

	const details = document.createElement("a");
	details.innerText = `${watched}/${available < downloadable ? `(${downloadable}) ` : ""}${available}`;
	details.title = `watched: ${watched} ; watchable: ${available} ; downloadable: ${downloadable}`;
	div.appendChild(details);

	selector.appendChild(div);
}

//!SECTION
//SECTION présentation

const presentation = document.createElement("div");
presentation.classList.add("presentation");
bod.appendChild(presentation);

let working = false;

function playVideo({
	source = "",
	autoplay = false,
	fullscreen = false
}){
	bod.classList.add("player");
	const video = document.createElement("video");
	video.id = "videoPlayer";
	video.src = source;
	video.setAttribute("controls", true);
	bod.appendChild(video);
	if (fullscreen === true)
		video.requestFullscreen();
	if (autoplay === true)
		video.play();
	move(changeURL({
		act: "playVideo",
		source: btoa(source)
	}));
}

function displayEp(toShow,elem, animeObj){
	const url = animeObj["link"] ??"";
	const name = animeObj["name"] ?? "Unknown";
	let worked = false;
	let traced;
	//console.log(JSON.stringify(toShow, undefined, "    "))
	Object.keys(toShow).sort((a,b)=> parseInt(a)-parseInt(b)).forEach((i)=> {
		worked = true;
		const file = document.createElement("div");
		file.classList.add(toShow[i]["class"] ?? "downloadable");
		file.setAttribute("view", i);
		function downloadEpisode (){
			if (traced["ep"][i] !== undefined
					&& traced["ep"][i]["downloaded"] !== true){
				download.emit("add", {
					url:traced["ep"][i]["url"],
					module: url.match(/https?:\/\/([^.]*)/)[1],
					filename: i,
					path: traced["path"],
					info: {
						anime: name,
						ep: i,
						show: toShow[i]["show"],
					}
				});
			}
		}
		file.onclick = ()=> {
			if (working === true) return alert("Please wait.");
			if (file.classList.contains("watchable")){
				if (!animeObj["path"]) return alert("Can't find the path to the anime\r\nPlease retrace the anime.");
				playVideo({
					source: `${location.origin}/video?file=${toShow[i]["file"]}&anime=${btoa(animeObj["path"])}`
				});
			}else{
				if (url === ""){
					return alert("This anime doesn not have a url");
				}
				file.setAttribute("disabled", true);
				file.classList.add("downloading");

				if (!traced){
					working = true;
					download.emit("trace", {
						url,
						module: url.match(/https?:\/\/([^.]*)/)[1]
					});

					download.once("tracer", m => {
						working = false;
						if (m["ok"] !== true) return alert ("Error while fetching episode : " + m.toString() );
						traced = m;
						downloadEpisode();
					});
				}else downloadEpisode();
			}
		};
		elem.appendChild(file);

		const a = document.createElement("a");
		a.innerText = toShow[i]["show"];
		file.appendChild(a);
	});
	if (worked === false){
		const files = document.createElement("a");
		files.innerText = "None found";
		presentation.appendChild(files);
	}
}
function show (animeObj= {
	name:"Unknown",
	files: [],
	currentStatus: "Incomplete",
	tags: ["Unknown"]
}){
	if (working === true) return alert("Please wait.");

	bod.classList.add("show");
	move(changeURL({
		act: "select",
		anime: btoa(animeObj["path"])
	}));
	[...presentation.children].forEach(e => e.remove());

	const name = document.createElement("h1");
	name.innerText = animeObj["name"] ?? "Unknown";
	presentation.appendChild(name);

	const retrace = document.createElement("h1");
	retrace.innerText = "⟳";
	retrace.onclick = ()=> {
		if (working === true) return alert("Please wait.");
		if (!animeObj["link"]) return alert("That anime isn't configured properly!");

		download.emit("trace", {
			url: animeObj["link"],
			module: animeObj["link"].match(/https?:\/\/([^.]*)/)[1]
		});
		retrace.classList.add("working");
		working = true;
		download.on("tracer", result => {
			working = false;
			retrace.classList.remove("working");
			show(result);
		});
	};
	presentation.appendChild(retrace);

	if (animeObj["error"]){
		const error = document.createElement("a");
		error.classList.add("error");
		error.innerText =animeObj["error"];
		presentation.appendChild(error);
	}

	const tags = document.createElement("a");
	tags.classList.add("tags");
	if (animeObj["tags"]
		&& Array.isArray(animeObj["tags"]))
		tags.innerText = animeObj["tags"].join(", ");
	else
		tags.innerText = "Unknown";
	presentation.appendChild(tags);

	const relations = document.createElement("div");
	relations.classList.add("relations");
	presentation.appendChild(relations);
	["prequel", "sequel"].forEach(relation => {
		if (animeObj[relation]){
			const relationName = animeObj[relation]["name"];
			const relationObj = [...document.querySelector("body > div.selector").children]
				.filter(ch => ch.hasAttribute("Selector_AnimeRef".toLowerCase())
				&& ch.getAttribute("Selector_AnimeRef".toLowerCase()) === relationName.replace(/(?![A-Za-z0-9 ])./g, "") + ` (SRC ${animeObj["module"]})`);

			const relationDiv = document.createElement("div");
			relationDiv.onclick = () => {
				if (relationObj.length !== 1){
					working = true;
					const url = animeObj[relation]["url"];
					download.emit("trace", {
						url,
						module: url.match(/https?:\/\/([^.]*)/)[1]
					});

					download.once("tracer", m => {
						working = false;
						if (m["ok"] !== true) return alert ("Error while fetching episode : " + m.toString() );
						show(m);
					});
				}
				relationObj[0].click();
			};
			relationDiv.classList.add("relation");
			relationDiv.classList.add(relation);
			relations.appendChild(relationDiv);

			const relationA = document.createElement("a");
			relationA.innerText = relation;
			relationDiv.appendChild(relationA);

			const relationH1 = document.createElement("h3");
			relationH1.innerText = relationName;
			relationDiv.appendChild(relationH1);

		}
	});

	let season = [];
	let notInSeason = [];
	if (animeObj["files"]
		&& Array.isArray(animeObj["files"])){
		animeObj["files"].forEach(e => notInSeason.push(e));
		animeObj["files"].forEach(ep => {
			if (ep.includes(" - ")){
				removeFromArray(ep, notInSeason);
				if (!season.includes(ep.replace(/ -.*$/, "")))
					season.push(ep.replace(/ -.*$/, ""));
			}
		});
	}

	if (animeObj["currentEpisodes"]
		&& Array.isArray(animeObj["currentEpisodes"])){
		animeObj["currentEpisodes"].forEach(e => notInSeason.push(e));
		animeObj["currentEpisodes"].forEach(ep => {
			if (ep.includes(" - ")){
				removeFromArray(ep, notInSeason);
				if (!season.includes(ep.replace(/ -.*$/, "")))
					season.push(ep.replace(/ -.*$/, ""));
			}
		});
	}


	if (season.length ===0
	|| 	notInSeason.length !== 0) season.push (-1);
	season.forEach(season => {
		const episode = document.createElement("h2");
		episode.innerText = season ===-1
			? "Episodes"
			: (/^[0-9]*$/.test(season) ? "Saison " : "") + season;
		presentation.appendChild(episode);
		const episodesGrid = document.createElement("div");
		episodesGrid.classList.add("EpGrid");
		presentation.appendChild(episodesGrid);

		let toShow = {};
		if (animeObj["currentEpisodes"]
			&& Array.isArray(animeObj["currentEpisodes"])){
			animeObj["currentEpisodes"]
				.filter(ep =>
					(season === -1 && !ep.includes(" - "))
					||ep.startsWith(season + " - ")
				)
				.map (ep => {
					if(ep.endsWith(" Final")){
						return ep.replace(/ Final$/, "");
					}
					return ep;
				})
				.sort((a,b)=>parseInt(a)-parseInt(b))
				.forEach(fileName => {
					// console.log("downloadable", fileName)
					toShow[fileName] = {
						class: "downloadable",
						file: undefined,
						show: season !== -1 ? fileName.replace(season + " - ", "") : fileName,
					};

				});
		}
		if (animeObj["files"]
			&& Array.isArray(animeObj["files"])){
			animeObj["files"]
				.filter(ep =>
					(season === -1 && !ep.includes(" - "))
					||ep.startsWith(season + " - ")
				)
				.sort((a,b)=>parseInt(a.replace(extensionRegex, ""))-parseInt(b.replace(extensionRegex, "")))
				.forEach(fileName => {
					// console.log("watchable", fileName.replace(extensionRegex, ""))
					toShow[fileName.replace(extensionRegex, "")] = {
						class: "watchable",
						file: fileName,
						show: (season !== -1 ? fileName.replace(season + " - ", "") : fileName).replace(extensionRegex, ""),
					};

				});
		}
		displayEp(toShow, episodesGrid, animeObj);
	});


}
//!SECTION


let browse =io("/browse", {
	rememberUpgrade : true,
});
let stats ={
	ep: 0,
	anime: 0,
};
let displayed = [];
browse.on("list", list => {
	working = false;
	displayed = [];
	stats ={
		ep: 0,
		anime: 0,
	};
	[...selector.children].forEach(e => e.remove());
	[...presentation.children].forEach(e => e.remove());
	if (bod.classList.contains("show"))
		bod.classList.remove("show");

	list = JSON.parse(list);
	console.log(list);
	for (const animeName in list) {
		stats["anime"] +=1;
		let animeObject = list[animeName];
		const animeNameEdited = !displayed.includes(animeObject.name) ? animeObject.name : animeName;
		displayed.push(animeNameEdited);
		if (!animeObject["path"]) animeObject["path"] = animeName;

		addAnimeToSelector({
			animeName: animeNameEdited,
			onclick: ()=>show(animeObject),
			available: animeObject["files"]?.length,
			downloadable: animeObject["currentEpisodes"]?.length,
			ref: animeName
		});

		if (Array.isArray(animeObject.files)){
			let episodes=[];
			stats["ep"] += animeObject.files.filter(file => {
				if (file.endsWith(".json")
					|| file.endsWith(".yml")) return false;

				const fileNoExtension = file.replace(extensionRegex, "");
				if (episodes.includes(fileNoExtension)) return false;
				episodes.push(fileNoExtension);
				return true;
			}).length;
		}
		//debugger
	}
	browseReList.classList.remove("working");
	refreshPageState();
});
browse.emit("list");

document.getElementById("loading").innerText = "Browse";
const browseReList = document.createElement("a");
browseReList.innerText = "⟳";
browseReList.onclick = ()=> {
	if (working === true) return alert("Please wait.");
	working = true;
	browseReList.classList.add("working");
	browse.emit("list");
};
document.getElementById("loading").appendChild(browseReList);

document.addEventListener("keyup", event => {
	switch (event.key.toLowerCase()) {
	case "escape":{
		if (bod.classList.contains("player")){
			history.back();
			return;
		}
		if (bod.classList.contains("show")){
			history.back();
			return;
		}
		break;
	}
	default:{
		break;
	}
	}
});
function refreshPageState(){
	[...presentation.children].forEach(e => e.remove());
	if (bod.classList.contains("player")){
		const player = document.getElementById("videoPlayer");
		if (player)
			player.remove();
		bod.classList.remove("player");
	}
	bod.classList.remove("show");

	const params = (new URL(location)).searchParams;
	if (params.has("act")){
		switch (params.get("act")) {
		case "playVideo":{
			if (params.has("source")){
				const source = atob(params.get("source"));
				playVideo({
					source
				});
			}else{
				alert("Could not autoplay video\r\nwe did not found it in the url");
			}
			break;
		}
		case "select":{
			if (params.has("anime")){
				const anime = atob(params.get("anime"));
				const availableSource = [...document.querySelector("body > div.selector").children]
					.filter(ch => ch.hasAttribute("Selector_AnimeRef".toLowerCase())
					&& ch.getAttribute("Selector_AnimeRef".toLowerCase()) === anime);
				if (availableSource.length ===0){
					return alert("This anime could not be found.");
				}
				bod.classList.add("show");
				const source = availableSource[0];
				source.click();
			}else{
				alert("Did not found the anime to view");
			}
			break;
		}

		default:{
			break;
		}
		}
	}

}
window.addEventListener("popstate", () => {
	refreshPageState();
});
setInterval(()=> {
	try {
		document.title = `${stats["anime"]} animes, and ${stats["ep"]} episodes.`;
	} catch (error) {
		document.title = "Refreshing...";
	}
}, 200);