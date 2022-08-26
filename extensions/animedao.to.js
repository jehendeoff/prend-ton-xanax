(async ()=> {
	if (typeof io === "undefined"){
		const socket = document.createElement("script");
		socket.src = "https://cdnjs.cloudflare.com/ajax/libs/socket.io/4.4.0/socket.io.js?version=4.4.0";
		socket.setAttribute("crossorigin", "anonymous");
		socket.setAttribute("referrerpolicy", "origin");
		document.head.appendChild(socket);
	}
	function sleep(ms) {
		return new Promise(resolve => {
			setTimeout(resolve, ms);
		});
	}
	async function waitIO(){
		if (typeof io !== "undefined") return true;
		await sleep (200);
		return await waitIO();
	}
	await waitIO();

	const download = io("http://localhost:10410/download");

	(()=> {
		const a = document.createElement("a");
		a.innerText = "Trace";
		a.classList.add("label");
		a.classList.add("animedao-color");

		a.onclick = ()=> {
			download.emit("trace", {
				url: document.location.href,
				module: document.location.host.replace(/\..*$/, "")
			});
		};
		document.querySelector(".col-lg-8 > h2:nth-child(1)").appendChild(a);
	})();
})();