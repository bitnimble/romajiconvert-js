const child_process = require('child_process');
const hepburn = require('hepburn');
const fs = require('fs');

//Load custom kana replacements
let customTags;
try {
    let customTagText = fs.readFileSync("./customTags.json");
    let parsed = JSON.parse(customTagText);
    if (!parsed.dict)
        throw "Invalid customTags.json dictionary supplied";
    customTags = parsed.dict;
} catch (e) {
    console.log(e);
    console.log("Falling back to empty custom tags...");
    customTags = {};
}

//Load borrowed words
try {
    let customTagText = fs.readFileSync("./borrowedWords.json");
    let parsed = JSON.parse(customTagText);
    if (!parsed.dict)
        throw "Invalid borrowedWords.json dictionary supplied";

	//Merge into customTags
    customTags = Object.assign(customTags, parsed.dict);
} catch (e) {
    console.log(e);
    console.log("Falling back to empty borrowed words...");
}

function isDigit(c) {
    let cc = c.charCodeAt(0);
    return cc >= 48 && cc <= 57;
}

function isLowercaseLetter(c) {
    let cc = c.charCodeAt(0);
    return cc >= 97 && cc <= 122;
}

function postprocess(input) {
    input = input.toLowerCase();
    let newString = [];
    for (let i = 0; i < input.length; i++) {
        if (isDigit(input[i]) || isLowercaseLetter(input[i]) || input[i] === ' ') {
            newString.push(input[i]);
        }
    }
    
    return newString.join('');
}

function splitArray(input, delim, trim) {
    let currentSubArray = [];
    let masterArray = [];
    for (let i of input) {
        let val = trim ? i.trim() : i;
        if (val === delim) {
            masterArray.push(currentSubArray);
            currentSubArray = [];
        } else {
            currentSubArray.push(i);
        }
    }
    masterArray.push(currentSubArray);
    return masterArray;
}

function toRomaji(kana) {
	kana = kana.trim();
	//Replaces inline borrowed words katakana/weird names with their English counterparts
	if (customTags[kana])
		return customTags[kana];
	
    return hepburn.fromKana(kana).toLowerCase();
}

function replaceReading(lines, start, end, replacement) {
	let toAdd = postprocess(replacement) + "\t,*,*,*,*,*,*,*,*";
	lines.splice(start, end, toAdd);
}

function processInlineCustomTags(lines) {
	let newLines = lines.slice(0);
	
	//Check if sequences pure hiragana/katakana match against any custom tags, replace if so
	let start = 0;
	let count = 0;
	let currentSequence = '';
	let lastState = "";
	let first = true;
	for (let i = 0; i < lines.length; i++) {
		let line = lines[i];
        let components = line.trim().split(",");
		let token = components[0].split('\t')[0];
		
		//What type is this line?
		let hira = hepburn.containsHiragana(token);
		let kata = hepburn.containsKatakana(token);
		let thisState = hira ? "hira" : (kata ? "kata" : "other");
		
		if (first) {
			//Reset start index and count if its the first token
			first = false;
            currentSequence += token;
            count++;
            start = Math.max(i - 1, 0);
		} else if (thisState != lastState) {
			//Changed from hira to kata, vice versa, or to kanji/english
			if (currentSequence.trim() != '' && customTags[currentSequence]) {
				replaceReading(newLines, start, count, customTags[currentSequence]);
            }

            //Reset the sequence
            first = true;
            currentSequence = token;
            start = i; 
            count = 1;
		} else {
			currentSequence += token;
			count++;
		}
		
		lastState = thisState;
	}
	
	//Process it once more at the end
	if (currentSequence.trim() != '' && customTags[currentSequence]) {
		replaceReading(newLines, start, count, customTags[currentSequence]);
	}
	
	return newLines;
}

function parseMecabOutput(lines) {
	lines = processInlineCustomTags(lines);
	
    let result = [];
    
    for (let line of lines) {
        let components = line.trim().split(",");
        if (components[components.length - 1] == "*")
            result.push(toRomaji(components[0].split("\t")[0])); //Push the english if MeCab didn't parse it
        else
            result.push(toRomaji(components[components.length - 2]))
    }
    return postprocess(result.join(" "));
}

function stripEmptyTrimmedElements(arr) {
    let newArr = [];
    for (let i = 0; i < arr.length; i++) {
        if (arr[i].trim() != '')
            newArr.push(arr[i]);
    }
    return newArr;
}

function convertToRomaji(title, artist, anime, album) {
    return new Promise((resolve, reject) => {
        //Trim all input if exists
        title = title || "";
        artist = artist || "";
        anime = anime || "";
        album = album || "";
        
        //Start kakasi
        let child = child_process.exec('mecab');
        child.stdin.write(title + "\n");
        child.stdin.write(artist + "\n");
        child.stdin.write(anime + "\n");
        child.stdin.write(album);
        child.stdin.end();
        
        let result = "";
        child.stdout.on("data", data => {
            result += data;
        });
        child.stdout.on("end", () => {
			let finalResult = {};
            let lines = result.split("\n");
            //Strip empty
            lines = stripEmptyTrimmedElements(lines);
            let resultArrays = splitArray(lines, "EOS", true);
            
            //Ignore mecab results if they matched a custom tag
            finalResult.title = parseMecabOutput(resultArrays[0]);
            finalResult.artist = parseMecabOutput(resultArrays[1]);
            finalResult.anime = parseMecabOutput(resultArrays[2]);
            finalResult.album = parseMecabOutput(resultArrays[3]);
            
            resolve(finalResult);
        });
        
        child.on("error", (e) => reject(e));
    });
}

let input = "精霊剣舞祭";
convertToRomaji(input).then(r => console.log("Input: " + input + "\n" + "Output: " + r.title));

module.exports = convertToRomaji;