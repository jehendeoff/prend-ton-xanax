exports.cancelCloudflare = async (page) => {
	if (await hasCloudflare(page) === true){
		await page.reload({ waitUntil: ["networkidle0", "domcontentloaded"] });

		
		if (await hasCloudflare(page) === true) {
			await page.waitForTimeout(5500);
			await this.cancelCloudflare(page);
		}
	}
	return;
};
const hasCloudflare = async (page) => {
	try {
		if (await page.title() === "Just a moment...") return true;
	} catch (error) {
		return false;
	}
	return false;
};