const css = `
.video>.controls{
	visibility: hidden;
	color: white;
	position: absolute;
	bottom: 0;
	left: 0;
	width: calc(100% - 10px * 2);
	padding: 0px 10px 3px 10px;
	opacity: 0;
	background: linear-gradient(to top,#222,#666);
	display:flex;

}
.video>.controls>*{
	display: inline;
	padding: 0 5px;
}
.video>.controls>a,
.video>.controls>input{
	padding: 5px 0 0 0
}
.video>.controls>input{
	outline: none !important
}
.video>.controls>.fullscreen{
	float:right;
}
.video>.controls>input.timer{
	width: 100%;
	/*background: black;*/
	flex:5;
}
.video>.controls>button{
	background: unset;
	border: unset;
	color: white;
	font-size: larger;
	cursor: pointer;
}
body.moved .video>.controls,
.video>.controls:hover{
	opacity: 0.8;
	visibility: unset;
}
.video{
	height : 100%;
	width : 100%;
}
.video>video {
	height: 100%;
	width : 100%
}
.video,
.video>*{

	display : block;
}
`;
const GVideosButtons = {
	//https://en.wikipedia.org/wiki/Media_control_symbols
	"play pause toggle":  {
		default: "⏯",
		pause: "⏸",
		play: "⏵"//⏵▶
	},
	fullscreen: {
		default: "⛶"
	}
};
(()=> {
	const cssElem = document.createElement("style");
	cssElem.innerHTML = css;
	document.getElementsByTagName("head")[0].appendChild(cssElem);
})();

function onRemoved(node, callback) {
	const observer = new MutationObserver((mutations) => {
		for (let m = 0; m < mutations.length; m++) {
			const mutation = mutations[m];
			const nodes = Array.from(mutation.removedNodes);
			const directMatch = nodes.indexOf(node) > -1;
			const parentMatch = nodes.some(parent => parent.contains(node));
			if (directMatch || parentMatch) {
				observer.disconnect();
				callback();
			}
		}
	});

	observer.observe(document.body, {subtree: true, childList: true});
}

let lastmove = [0, 0];
let lastTimeMoved = 0;
const minimumMove = 5;
document.addEventListener("mousemove", event => {
	const oldX = lastmove[0]
		, oldY = lastmove[1]
		, newX = event.pageX
		, newY = event.pageY
		, diffX = Math.abs(oldX - newX)
		, diffY = Math.abs(oldY - newY);

	if (diffX > minimumMove
	|| diffY > minimumMove){
		const time = Date().toString();
		lastmove = [newX, newY];
		lastTimeMoved = time;
		document.body.classList.add("moved");


		setTimeout(()=> {
			if (time === lastTimeMoved){
				document.body.classList.remove("moved");
			}

		}, 1500);
	}else
		lastmove = [newX, newY];

});


function duration (time, forceHour){
	if (isNaN(time))return (forceHour ? "xx:": "") + "xx:xx";
	time = Math.ceil(time);
	const hour = Math.floor(time / 3600)
		, min = Math.floor((time - hour *3600) / 60)
		, sec = time - (hour *3600) - min * 60;

	if (hour >0) return `${hour.toString().padStart(2, "0")}:${min.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;

	return `${min.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
}

let speed = {
	fastforward : 5,
	rewind : 5
};
const RewindResolution = 1.5;

// eslint-disable-next-line no-unused-vars
class Gvideo{
	constructor (video){
		this._videoElem = video;
		this.isPlaying = !video.paused;

		const div = document.createElement("div");
		div.classList.add("video");
		div.style.setProperty("display", "block", "important");

		video.parentElement.insertBefore(div, video);
		this._defaultPlaybackRate = 1;

		this._fastForwarding = false;
		this._fastForward = () => {
			if (this._fastForwarding === true) return;
			video.playbackRate +=speed.fastforward;
			this._fastForwarding = true;

		};

		this._rewinding = false;
		this._rewindINT = 0;
		this._rewind = () => {
			if (this._rewinding === true) return;
			this._rewinding = true;
			video.pause();
			this._rewindINT = setInterval(() => {
				if (video.currentTime > 1)
					video.currentTime -= 1/RewindResolution;
				else
					video.currentTime = 0;

			}, 1000 / speed.rewind / RewindResolution);
		};

		this._stopFastForward = () => {
			if (this._fastForwarding === false) return;
			timerSlide.value = video.currentTime;
			video.playbackRate -=speed.fastforward;
			this._fastForwarding = false;
			//NOTE video and audio desync on firefox
			video.currentTime = timerSlide.value;

		};

		this._stopRewind = ()=> {
			if (this._rewinding === false) return;
			this._rewinding = false;
			clearInterval(this._rewindINT);
			if (this.isPlaying) video.play();
		};

		div.addEventListener("keydown", event => {

			switch (event.key.toLowerCase()) {
			case "arrowleft":{
				this._rewind();
				break;
			}
			case "arrowright":{
				this._fastForward();
				break;
			}
			default:{
				break;
			}
			}
		});
		div.addEventListener("keyup", event => {

			switch (event.key.toLowerCase()) {
			case "arrowleft":{
				this._stopRewind();
				break;
			}
			case "arrowright":{
				this._stopFastForward();
				break;
			}
			case " ":{
				this.playPauseToggle();
				break;
			}
			default:{
				break;
			}
			}
		});

		div.appendChild(video);

		const controlsDiv = document.createElement("div");
		div.appendChild(controlsDiv);
		controlsDiv.classList.add("controls");

		this.controlsDiv = controlsDiv;

		const playButton = document.createElement("button");
		playButton.classList.add("play");
		playButton.innerText = GVideosButtons["play pause toggle"]["default"];


		this.playPauseToggle = ()=> {
			//if (!document.hasFocus()) return
			if (video.paused){
				playButton.innerText = GVideosButtons["play pause toggle"]["pause"];
				this.isPlaying = true;
				video.play();
			}
			else{
				playButton.innerText = GVideosButtons["play pause toggle"]["play"];
				this.isPlaying = false;
				video.pause();
			}
		};
		this._videoLastClick = 0;
		this.videoClickEvent = ()=>{
			if (this._videoLastClick + 500 >= Date.now()){
				this.fullscreenToggle();
				this._videoLastClick = 0;
			}else
				this._videoLastClick = Date.now();
			this.playPauseToggle();

		};
		video.onclick = this.videoClickEvent;
		playButton.onclick = this.playPauseToggle;


		const currentTimeA = document.createElement("a");
		currentTimeA.classList.add("timer");
		currentTimeA.innerText = duration(0);

		// const timerDIV = document.createElement("div");
		// controlsDiv.appendChild(timerDIV);
		// timerDIV.classList.add("timer");


		const timerSlide = document.createElement("input");
		timerSlide.setAttribute("type", "range");
		timerSlide.setAttribute("min", "0");
		timerSlide.setAttribute("step", "0.01");
		timerSlide.setAttribute("max", Math.ceil(video.duration));
		timerSlide.value = 0;
		timerSlide.classList.add("timer");

		this._lockslider = false;
		timerSlide.addEventListener("keydown", ()=> {
			this._lockslider = true;
		});
		timerSlide.addEventListener("keyup", ()=> {
			this._lockslider  =false;
		});

		//seeking
		timerSlide.addEventListener("change", () => {
			if (this.isPlaying) video.play();
		});
		timerSlide.addEventListener("click", () => {
			if (this.isPlaying) video.play();
		});
		timerSlide.addEventListener("input", event => {
			if (this._lockslider === true) return false;
			(async ()=> {
				if (!video.paused) video.pause();
				video.currentTime = event.target.value;

				const time = Date().toString();

				document.body.classList.add("moved");
				lastTimeMoved = time;

				setTimeout(()=> {
					if (time === lastTimeMoved){
						document.body.classList.remove("moved");
					}

				}, 1500);
			})();


			//console.log(event);
		});

		//when the video plays, update the slider
		this.updateTimer = () => {
			const currentTime = video.currentTime;
			timerSlide.value = currentTime;
			currentTimeA.innerText = duration(currentTime, video.duration > 3600);
		};
		video.addEventListener("timeupdate", this.updateTimer);


		const timerA = document.createElement("a");
		timerA.classList.add("timer");
		timerA.innerText = duration(video.duration);

		this.calibrateTimer = ()=> {
			timerA.innerText = duration(video.duration);
			timerSlide.setAttribute("max", Math.ceil(video.duration));
		};
		this.calibrateTimer();

		video.addEventListener("loadedmetadata", this.calibrateTimer);

		const fullscreenButton = document.createElement("button");
		fullscreenButton.classList.add("fullscreen");
		fullscreenButton.innerText = "⛶";
		this.fullscreenToggle = ()=> {
			if (document.fullscreenElement){
				document.exitFullscreen();
			}
			else{
				div.requestFullscreen();
			}
		};
		fullscreenButton.onclick = this.fullscreenToggle;


		//appending everything in the right order

		controlsDiv.appendChild(playButton);
		controlsDiv.appendChild(currentTimeA);
		controlsDiv.appendChild(timerSlide);
		controlsDiv.appendChild(timerA);
		controlsDiv.appendChild(fullscreenButton);



		//controlsDiv.style.setProperty("visibility", "unset");
		video.removeAttribute("controls");
		onRemoved(video, ()=> {
			div.remove();
		});
	}

	get _Video (){
		return this._videoElem;
	}
}