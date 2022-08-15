const CorrectFileName = fn => {
	return fn.replace(/(?![A-Za-z0-9 ,"'!.])./g, "");
};

//https://stackoverflow.com/questions/30106476/using-javascripts-atob-to-decode-base64-doesnt-properly-decode-utf-8-strings
function tob64(str) {
	// first we use encodeURIComponent to get percent-encoded UTF-8,
	// then we convert the percent encodings into raw bytes which
	// can be fed into btoa.
	return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g,
		function toSolidBytes(match, p1) {
			return String.fromCharCode("0x" + p1);
		}));
}
function fromb64(str) {
	// Going backwards: from bytestream, to percent-encoding, to original string.
	return decodeURIComponent(atob(str).split("").map(function(c) {
		return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
	}).join(""));
}
function median(values){
	if(values.length ===0) throw new Error("No inputs");

	values.sort(function(a,b){
		return a-b;
	});

	var half = Math.floor(values.length / 2);

	if (values.length % 2)
		return values[half];

	return (values[half - 1] + values[half]) / 2.0;
}
function getLightning(url,{
	captureAll = true,
	captureY = 150,
	captureX = 150,
	centerY = true,
	method= "median",
	responseType="all",
	reponsePlage = 255,
	actualWidth = undefined
}){
	return new Promise ((res) => {
		const image = new Image();
		image.onload = function() {
			if (captureX > this.width) captureX = this.width;
			if (captureY > this.height) captureXY= this.height;
			if (!actualWidth) actualWidth = this.width;

			const canvas = document.createElement("canvas");
			//document.body.appendChild(canvas);
			if (captureAll ===true){
				canvas.height = this.height;
				canvas.width = this.width;
			}else{
				canvas.height = captureY;
				canvas.width = captureX;
			}

			const context = canvas.getContext("2d");

			const imageY = captureAll === true
				? 0
				: centerY === true
					? this.height /2 - captureY/2
					: 0;

			const scale = this.width / actualWidth;
			context.scale(scale, scale);
			context.drawImage(image,0,0-imageY);
			context.setTransform(1, 0, 0, 1, 0, 0);

			let imageData = context.getImageData(0, 0, canvas.width, canvas.height);
			let data = imageData.data;

			const red = []
				, green = []
				, blue = [];


			for (let i = 0; i <data.length; i += 4) {
				if (data[i+3] === 0) continue;
				red.push  (data[i]);
				green.push(data[i+1]);
				blue.push (data[i+2]);
			}
			let moyenne = [0,0,0];
			if (method === "mean"){
				moyenne[0] = (red.reduce((a, b) => a + b, 0) / red.length);
				moyenne[1] = (green.reduce((a, b) => a + b, 0) / green.length);
				moyenne[2] = (blue.reduce((a, b) => a + b, 0) / blue.length);
			}
			if (method === "median"){
				moyenne[0] = median(red);
				moyenne[1] = median(green);
				moyenne[2] = median(blue);
			}
			moyenne = moyenne.map(value => value /(256 - reponsePlage));
			if (responseType === "all")
				return res(moyenne);
			else
				return res(moyenne.reduce((a, b) => a + b, 0) / moyenne.length);

		};

		image.onerror = err => { console.log(err); };
		image.src = url;
	});

}


module.exports = {
	CorrectFileName
};