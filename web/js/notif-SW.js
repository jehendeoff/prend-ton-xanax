self.addEventListener("push", function (event) {
	let messageData;
	try {
		messageData = JSON.parse(event.data.text());
	} catch (error) {
		return;
	}

	const title = messageData["title"];
	const body = messageData["body"]; // should be messageData.text(), but that's not supported in Gecko yet.
	const icon = messageData["icon"];
	const tag = "push";

	event.waitUntil(
		self.registration.showNotification(title, {
			body: body,
			icon: icon,
			tag: tag,
			renotify : true
		})
	);

});