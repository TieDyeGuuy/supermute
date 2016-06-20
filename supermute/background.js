var hatedata

// code by Kryptonite Dove
// discovered in codepen.
// https://codepen.io/KryptoniteDove/post/load-json-file-locally-using-pure-javascript
function loadJSON(callback) {
  var xobj = new XMLHttpRequest();
  xobj.overrideMimeType("application/json");
  xobj.open('GET', 'web_source\\hbu.json', true);
  xobj.onreadystatechange = function () {
    if (xobj.readyState == 4 && xobj.status == "200") {
      callback(xobj.responseText);
    }
  };
  xobj.send(null);
}

function getHatedata() {
  loadJSON(function(response) {
    hatedata = JSON.parse(response);
  });
}
