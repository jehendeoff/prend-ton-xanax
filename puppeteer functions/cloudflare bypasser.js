exports.cancelCloudflare = async (page) => {
	if (await hasCloudflare(page) === true){
		await await page.reload({ waitUntil: ["networkidle0", "domcontentloaded"] });

		
		if (await hasCloudflare(page) === true) {
			await page.waitForTimeout(5500);
			await this.cancelCloudflare(page);
		}
	}
	return;
};
const hasCloudflare = async (page) => {
	return await page.evaluate(async () => {
		if (document.title === "Just a moment...") return true;
		return false;
	});
};