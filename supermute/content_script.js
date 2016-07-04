var debug = true;

function test(message) {
  if (debug) {console.log(document.URL);}
}

test(null);
chrome.runtime.onMessage.addListener(test);
