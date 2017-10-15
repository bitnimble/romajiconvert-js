# romajiconvert-js

A small wrapper around [Mecab](http://taku910.github.io/mecab/) to convert Japanese sentences, phrases and words to romaji. Supports mixed ASCII, kana and kanji, and the romanisation is contextually aware (correct onyomi vs kunyomi, alternate readings and ha -> wa detection).

The original purpose of this project was to generate searchable romaji tags for a song database (i.e. being able to search for "seimeisen" and receive results for Reol's song 生命線, as shown in the example below).

The script also supports replacement of specific hiragana and katakana words if you wish for them to be romanised differently -- for example, romanising certain borrowed words with the actual original English word: ハンバーガー --> "hamburger" instead of "hanbaagaa". A set of common English loan words is already included in `borrowedWords.json`. `customTags.json` is exactly the same (they are both loaded into the same lookup table); I've only separated it for organising purposes, so that I can have loan words in `borrowedWords.json` and other things like artist names in `customTags.json`.


# Installation

Add `"romajiconvert-js": "github:anonymousthing/romajiconvert-js"` to your package.json dependencies list and npm install it.

You will also need to install Mecab on your system:

## Windows

Binaries can be found at [this link](http://taku910.github.io/mecab/).

## Linux

Users can either `sudo apt install mecab` or compile it from source from the same link.

## macOS

Using [Homebrew](https://brew.sh/):

```sh
$ brew install mecab
$ brew install mecab-ipadic
```


# Usage

```js
const romajiconvert = require('romajiconvert-js')

romajiconvert("生命線", "れをる", "", "極彩色").then((result) => {
    console.log("Title: " + result.title + "\n" +
        "Artist: " + result.artist + "\n" +
        "Anime: " + result.anime + "\n" +
        "Album: " + result.album);
});

```

which returns

```
Title: seimeisen
Artist: reol
Anime:
Album: gokusaishoku
```

("れをる" is predefined in `customTags.json` to convert to "reol" instead of "reworu")


## API

There's only one function, which is...
```
romajiconvert([string] title, [string] artist, [string] anime, [string] album)
    =>  Promise({
            title: [string]
            artist: [string]
            anime: [string]
            album: [string]
        })
```

Input arguments which are not supplied/defined will be safely ignored (and return empty string for that result property)
