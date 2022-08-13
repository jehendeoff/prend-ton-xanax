const CorrectFileName = fn => {
	return fn.replace(/(?![A-Za-z0-9 , "'])./, "");
};

module.exports = {
	CorrectFileName
};