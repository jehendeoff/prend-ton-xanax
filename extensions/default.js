(()=> {
	const URL = "http://localhost:10410";

	const script = document.createElement("script");
	script.src = URL +"/extension.js";
	script.setAttribute("crossorigin", "anonymous");
	//script.setAttribute("defer", " ");
 	//script.setAttribute("referrerpolicy", "origin")
	document.head.appendChild(script);
})();