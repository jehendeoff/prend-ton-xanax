(async () => {
	const host = location.host;
	const publicKey = `${location.protocol}//${host}/pushpublicKey`;
	const pushCodePoint = `${location.protocol}//${host}/pushentrypoint`;
	const notifSW = `${location.protocol}//${host}/js/notif-SW.js`;
	if (!("serviceWorker" in navigator)) {
		// Service Worker isn't supported on this browser, disable or hide UI.
		console.error("Service Worker isn't supported on this browser.");
		return;
	}

	if (!("PushManager" in window)) {
		// Push isn't supported on this browser, disable or hide UI.
		console.error("Push isn't supported on this browser.");
		return;
	}
	if (Notification.permission === "denied") {
		return;
	}

	function isopen() {
		return new Promise((res) => {
			fetch(publicKey).then(() => res(true)).catch(() => res(false));
		});
	}
	if (!await isopen()) {
		// Backend does not provide its public key
		console.error("Backend does not provide Push public key.");
		return;
	}

	function askPermission() {
		return new Promise(function (resolve, reject) {

			const permissionResult = Notification.requestPermission(function (result) {
				resolve(result);
			});

			if (permissionResult) {
				permissionResult.then(resolve, reject);
			}
		}).then(function (permissionResult) {
			if (permissionResult !== "granted") {
				throw new Error("We weren't granted permission.");
			}
		});
	}

	function urlBase64ToUint8Array(base64String) {
		const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
		const base64 = (base64String + padding)
			.replace(/-/g, "+")
			.replace(/_/g, "/");
		const rawData = window.atob(base64);
		const outputArray = new Uint8Array(rawData.length);
		for (let i = 0; i < rawData.length; ++i) {
			outputArray[i] = rawData.charCodeAt(i);
		}
		return outputArray;
	}

	function subscribeUserToPush() {
		return navigator.serviceWorker
			.register(notifSW)
			.then(async function (registration) {
				const subscribeOptions = {
					userVisibleOnly: true,
					applicationServerKey: urlBase64ToUint8Array(
						await fetch(publicKey).then(body => body.text()),
					),
				};
				window.reg = registration;

				return registration.pushManager.subscribe(subscribeOptions);
			})
			.then(function (pushSubscription) {
				console.log("Received PushSubscription: ", JSON.stringify(pushSubscription));
				return pushSubscription;
			});
	}


	async function sendSubscriptionToBackEnd(subscription) {
		subscription = JSON.parse(JSON.stringify(subscription));
		const subscriptionObject = {
			endpoint: subscription.endpoint,
			keys: {
				p256dh: subscription["keys"]["p256dh"],
				auth: subscription["keys"]["auth"],
			},
		};
		return fetch(pushCodePoint, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(subscriptionObject),
		})
			.then(function (response) {
				if (!response.ok) {
					throw new Error("Bad status code from server.");
				}

				return response.json();
			})
			.then(function (responseData) {
				if (!(responseData.data && responseData.data.success)) {
					throw new Error("Bad response from server.");
				}
			});
	}

	async function isgood(){

		navigator.serviceWorker.getRegistrations().then(function (registrations) {
			for (let registration of registrations) {
				registration.unregister();
			}
		});

		const sub = await subscribeUserToPush();

		console.log(await sendSubscriptionToBackEnd(sub));
	}

	async function t() {
		await askPermission();
		if (Notification.permission === "granted") isgood();
	}
	if (Notification.permission === "default") {
		return document.addEventListener("click", t, {
			once: true
		});
	}
	isgood();



})();

/*
(()=> {
	const URL = location.protocol + "//" + location.host;

	const script = document.createElement("script");
	script.src = URL +"/js/testNotif.js";
	script.setAttribute("crossorigin", "anonymous");
	//script.setAttribute("defer", " ");
 	//script.setAttribute("referrerpolicy", "origin")
	document.head.appendChild(script);
})();
*/