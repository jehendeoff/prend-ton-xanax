/* eslint-disable no-async-promise-executor */
const fs = require("fs");
const debug= process.env["debug ffmpeg"] === "true";
const max_instances_at_instant = parseInt(process.env["instances ffmpeg"] ?? 4);
let ffmpeg;

try {
	const _spawn = require("child_process").spawn("ffmpeg", ["-h"]);
	_spawn.on("close", code => {
		if (code !== 0){
			if (debug) console.log(`FFMPEG not found (exited, with code ${code})`);
			ffmpeg = false;
			return;
		}
		if (debug) console.log("FFMPEG found");
		ffmpeg = true;
		return;

	});
	_spawn.on("error", err => {
		if (debug) console.log("FFMPEG errored");
		if (debug) console.error(err);
		ffmpeg = false;
		return;
	});
} catch (error) {
	if (debug) console.error(error.toString());
	ffmpeg = false;
}
function isReady(){
	if (ffmpeg === true)return true;
	if (ffmpeg === undefined) return false;
	if (ffmpeg === false){
		console.error("A ffmpeg function has been called, but you don't have ffmpeg installed.");
		return undefined;
	}
	return undefined;
}

let current = {};

function getVideoLength(file, path){
	return new Promise((resolve, reject) => {
		const FP = path+file;
		if (!fs.existsSync(FP) || fs.statSync(FP).isDirectory())
			return reject(new Error("The path can not be resolved to a file."));
		if (isReady() !== true) return reject(new Error("Not Ready"));

		const spawn = require("child_process").spawn("ffprobe",
			[
				"-v", "error", // only report error
				"-select_streams", "v:0", //select stram
				"-show_entries", "stream=duration", //only show the duration
				"-of", "default=noprint_wrappers=1:nokey=1",  // don't output the beautified version
				"\"" + file + "\"",    //the file

			],
			{
				cwd: path,
				shell: true,
				timeout: 10000,
			}
		);
		let buffer = "";
		let error = false;
		if (debug) console.log(`Spawning ffprobe (video length) for "${path}${file}" `);
		spawn.stderr.on("data", function(data) {
			if (debug) console.log(`ffprobe is outputting data for "${path}${file}" : ${data.slice(0,50)}`);
			if (data.toString().toLowerCase().includes("error")) return error = true;
		});
		spawn.on("error", function(err){
			if (debug) console.log(`ffprobe faced an error for "${path}${file}" : ${err.slice(0,50)}`);
			if (err.toString().toLowerCase().includes("error")) return error = true;
		});

		spawn.stdout.on("data", (data) => {
			if (debug) console.log(`ffprobe is outputting data for "${path}${file}" : ${data.slice(0,50)}`);
			if (data.toString().toLowerCase().includes("error")) return error = true;
			buffer += data.toString();
		});
		spawn.on("close", code => {
			if (debug) console.log(`ffprobe exiting with code ${code}, for "${path}${file}"`);
			if (error !== false) return resolve(false);
			if (code === 0){
				return resolve(buffer);
			}else{
				return resolve(false);
			}
		});
	});
}
// (async ()=> {
// 	const i = setInterval(async ()=> {
// 		if (isReady() === true){
// 			clearInterval(i);
// 			console.log(await getVideoLength("6.mp4", "/run/media/jehende/hdd/anime/Dont Hurt Me My Healer (SRC animedao)/"));
// 		}
// 	}, 200);
// })();

function testIntegrity(file, path){
	return new Promise((resolve, reject) => {
		const FP = path+file;
		if (!fs.existsSync(FP) || fs.statSync(FP).isDirectory())
			return reject(new Error("The path can not be resolved to a file."));
		if (isReady() !== true) return reject(new Error("Not Ready"));

		function end(){
			delete current[path + file];
		}
		async function work(){
			let videoLength = await getVideoLength(file, path);
			if (videoLength === false){
				return resolve(false);
			}
			if (videoLength.includes(".")) videoLength = videoLength.replace(/\.[0-9]+/, "");
			if (isNaN (parseInt(videoLength))){
				return resolve(false);
			}
			videoLength = parseInt(videoLength);

			const spawn = require("child_process").spawn("ffmpeg",
				[
					"-v", "error", // only report error
					"-i", "\""+file+"\"", //the file
					"-map", "0:1", //only analyse the sound track (faster)
					"-f", "null",  // don't output the conversion result
					"-", "2>&1"    //log in console

				],
				{
					cwd: path,
					shell: true,
					timeout: videoLength *10 + 500,
				}
			);
			let error = false;
			if (debug) console.log(`Spawning ffmpeg for "${path}${file}" `);
			spawn.on("error", function(err){
				if (err.toString().toLowerCase().includes("error")) error = true;
				if (debug) console.log(`ffmpeg faced an error for "${path}${file}" : ${err.slice(0,50)}`);
			});
			spawn.stdout.on("data", (data) => {
				if (data.toString().toLowerCase().includes("error")) error = true;
				if (debug) console.log(`ffmpeg is outputting data for "${path}${file}" : ${data.slice(0,50)}`);
			});
			spawn.stderr.on("data", function(data) {
				if (data.toString().toLowerCase().includes("error")) error = true;
				if (debug) console.log(`ffmpeg is outputting data for "${path}${file}" : ${data.slice(0,50)}`);
			});
			spawn.on("close", code => {
				if (debug) console.log(`ffmpeg exiting with code ${code}, for "${path}${file}"`);
				end();
				if (error !== false) return resolve(false);
				if (code === 0){
					return resolve(true);
				}else{
					return resolve(false);
				}
			});
		}
		const i = setInterval(()=> {
			if (Object.keys(current).length < max_instances_at_instant){
				clearInterval(i);
				current[path +file] = true;
				work();
			}
		},100);
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
		if (videos.length === 0){
			return resolve({});
		}
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