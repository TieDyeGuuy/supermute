var debug = true;

function test() {
  if (debug) {console.log(document.URL);}
}

function getID(message) {
  var node, iter;
  iter = document.createNodeIterator(document.body, NodeFilter.SHOW_TEXT);
  while ((node = iter.nextNode())) {
    console.log(node.parentElement.id)
  }
}

test();
chrome.runtime.onMessage.addListener(test);
