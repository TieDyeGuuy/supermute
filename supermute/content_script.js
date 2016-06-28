var port = null;

function connectListener(p) {
  port = p;
  p.onMessage.addListener(portListener);
  p.postMessage({request: "get words", port: p.name});
}

function portListener(message) {
  if (message === null || typeof message !== 'object') {
    throw new Error("Malicious message");
  }
  if (message.hasOwnProperty("response")) {
    switch(message.response) {
      case "words":
        getWords(message.words);
        break;
    }
  }
}

function getWords(topWords) {
  var rword = topWords[getRandomInt(0, topWords.length)].vocabulary;
  console.log(port.name + rword);
}

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min)) + min;
}

chrome.runtime.onConnect.addListener(connectListener);
chrome.runtime.sendMessage({"request": "connect"});
