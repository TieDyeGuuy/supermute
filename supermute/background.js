var hateURL = chrome.extension.getURL("web_source/hbu.json");
var hate = null;

console.log(hateURL);

function transferComplete() {
  hate = JSON.parse(this.responseText);
  console.log(hate.status);
}

var xobj = new XMLHttpRequest();
xobj.addEventListener("load", transferComplete)
xobj.overrideMimeType("application/json");
xobj.open('GET', hateURL);
xobj.send();
