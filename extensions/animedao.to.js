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
		const table = document.querySelector("body > div.container.main-container.min-vh-100.px-3 > div > div.row.mt-2.mb-1 > div > div > div > div > div.col-lg-8.px-4.py-3 > .table > tbody");
		const tr = document.createElement("tr");
		table.appendChild(tr);
		const a = document.createElement("a");
		tr.appendChild(a);
		a.href = "javascript:void(0);";
		const span = document.createElement("span");
		a.appendChild(span);
		span.innerText = "Trace";
		span.classList.add("badge");
		span.classList.add("badge-genre");

		a.onclick = ()=> {
			download.emit("trace", {
				url: document.location.href,
				module: document.location.host.replace(/\..*$/, "")
			});
		};
	})();
})();