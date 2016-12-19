## Example usage

```
const romajiconvert = require("./romajiconvert.js");

romajiconvert("生命線", "れをる", "", "極彩色").then((result) => {
    console.log("Title: " + result.title + "\n" +
        "Artist: " + result.artist + "\n" +
        "Anime: " + result.anime + "\n" +
        "Album: " + result.album);
});
```