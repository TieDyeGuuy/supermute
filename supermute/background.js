var hateURL = chrome.extension.getURL("web_source/hbu.json");
var hate = null;

function transferComplete() {
  hate = JSON.parse(this.responseText);
  var a = hate.data.datapoint.filter(generateSorter({
    "offensiveness": 0.7
  }));
  a = a.map(function(item) {
    return item.vocabulary;
  });
  console.log(a.toString());
}

var xobj = new XMLHttpRequest();
xobj.addEventListener("load", transferComplete);
xobj.overrideMimeType("application/json");
xobj.open('GET', hateURL);
xobj.send();

function generateSorter(filters) {
  return function(item) {
    for(var prop in filters) {
      switch(prop) {
        case "offensiveness":
          if(item[prop] < filters[prop]) {
            return false;
          }
          break;
        default:
          if(!(item[prop] === filters[prop])) {
            return false;
          }
      }
    }
    return true;
  };
}
