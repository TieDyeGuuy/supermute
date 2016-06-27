function getWords(topWords) {
  var rword = topWords.words[getRandomInt(0, topWords.words.length)].vocabulary;
  console.log(rword);
}

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min)) + min;
}

chrome.runtime.sendMessage({"request": "get words"}, getWords);
