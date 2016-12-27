const child_process = require('child_process');
const hepburn = require('hepburn');
const fs = require('fs');

let customTagText = fs.readFileSync("./customTags.json");
let customTags;
try {
    customTags = JSON.parse(customTagText);
} catch (e) {
    console.log(e);
    console.log("Falling back to empty custom tags...");
    customTags = {};
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
        if (isDigit(input[i]) || isLowercaseLetter(input[i])) {
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
    return hepburn.fromKana(kana).toLowerCase();
}

function parseMecabOutput(lines) {
    let result = [];
    
    for (let line of lines) {
        let components = line.trim().split(",");
        if (components[components.length - 1] == "*")
            result.push(toRomaji(components[0].split("\t")[0])); //Push the english if MeCab didn't parse it
        else
            result.push(toRomaji(components[components.length - 1]))
    }
    return postprocess(result.join(""));
}

function convertToRomaji(title, artist, anime, album) {
    return new Promise((resolve, reject) => {
        //Trim all input if exists
        title = title ? title.trim() : "";
        artist = artist ? artist.trim() : "";
        anime = anime ? anime.trim() : "";
        album = album ? album.trim() : "";
        
        let finalResult = {};
        //Apply custom tags on exact match
        if (customTags.dict[title]) finalResult.title = postprocess(customTags.dict[title]);
        if (customTags.dict[artist]) finalResult.title = postprocess(customTags.dict[artist]);
        if (customTags.dict[anime]) finalResult.title = postprocess(customTags.dict[anime]);
        if (customTags.dict[album]) finalResult.title = postprocess(customTags.dict[album]);
        
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
            let lines = result.split("\n");
            let resultArrays = splitArray(lines, "EOS", true);
            
            //Ignore mecab results if they matched a custom tag
            if (!finalResult.title) finalResult.title = parseMecabOutput(resultArrays[0]);
            if (!finalResult.artist) finalResult.artist = parseMecabOutput(resultArrays[1]);
            if (!finalResult.anime) finalResult.anime = parseMecabOutput(resultArrays[2]);
            if (!finalResult.album) finalResult.album = parseMecabOutput(resultArrays[3]);
            
            resolve(finalResult);
        });
        
        child.on("error", (e) => reject(e));
    });
}

module.exports = convertToRomaji;