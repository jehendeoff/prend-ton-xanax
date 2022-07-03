/* eslint-disable no-async-promise-executor */
const fs = require("fs");
const debug= process.env["debug ffmpeg"] === "true";
let ffmpeg;

const _spawn = require("child_process").spawn("ffmpeg", ["-version"]);
_spawn.on("close", code => {
	if (code !== 0){
		if (debug) console.log("FFMPEG not found");
		ffmpeg = false;
		return;
	}
	if (debug) console.log("FFMPEG found");
	ffmpeg = true;
	return;

});
function isReady(){
	if (ffmpeg === true)return true;
	if (ffmpeg === undefined) return false;
	if (ffmpeg === false){
		console.error("A ffmpeg function has been called, but you don't have ffmpeg installed.");
		return undefined;
	}
	return undefined;
}


function testIntegrity(file, path){
	return new Promise((resolve, reject) => {
		if (isReady() !== true) return reject(new Error("Not Ready"));
		const FP = path+file;
		if (fs.existsSync(FP) && !fs.statSync(FP).isDirectory()){
			const spawn = require("child_process").spawn("ffmpeg", 
				[
					"-v", "error", // only report error
					"-i", "\""+file+"\"", //the file
					"-map", "0:1", //only analyse the sound track (faster)
					"-f", "null",  // don't output the conersion result
					"-", "2>&1"    //log in console
				
				],
				{
					cwd: path,
					shell: true,
					timeout: 10000,
				}
			);
			if (debug) console.log("Spawning ffmpeg");
			spawn.on("error", function(err){
				if (debug) console.log(`ffmpeg faced an error for "${file}" : ${err.slice(0,50)}`);
			});
			spawn.stdout.on("data", (data) => {
				if (debug) console.log(`ffmpeg is outputting data for "${file}" : ${data.slice(0,50)}`);
			});
			spawn.stderr.on("data", function(data) {
				if (debug) console.log(`ffmpeg is outputting data for "${file}" : ${data.slice(0,50)}`);
			});
			spawn.on("close", code => {
				if (debug) console.log(`exiting with code ${code}, for "${file}"`);
				if (code === 0){
					return resolve(true);
				}else{
					return resolve(false);
				}
			});
		}else{
			reject(new Error("The path can not be resolved to a file."));
		}
	});

}
function testIntegrityDirectory(path){
	return new Promise(async(resolve, reject) => {
		if (isReady() !== true) return reject(new Error("Not Ready"));
		let ret = {};
		if (! fs.existsSync(path) || !fs.statSync(path).isDirectory())
			return reject(new Error("The path can not be resolved to a directory"));

		const videos = fs.readdirSync(path)
			.filter(obj => {
				return fs.statSync(path + obj).isFile();
			}).filter(file => {
				return file.endsWith(".mp4")
				|| file.endsWith(".avi")
				|| file.endsWith("mkv");
			});
		
		let completed = [];
		for (let i = 0; i < videos.length; i++) {
			const video = videos[i];
			const t = i;
			testIntegrity(video, path).then(result =>{
				ret[video] =result;
				completed.push(t);
				if (completed.length === videos.length){
					return resolve(ret);
				}
				
			}).catch(error => {
				console.log(error);
				completed.push(t);
				ret[video] = error;
				if (completed.length === videos.length){
					return resolve(ret);
				}
			});
			
		}
	});
}

module.exports = {
	testIntegrity,
	testIntegrityDirectory,
	ffmpeg,
	isReady
};