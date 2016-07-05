var debug = true;

function test() {
  if (debug) {console.log(document.URL);}
}

function getID(message) {
  var node, iter;
  iter = document.createNodeIterator(
      document.body,
      NodeFilter.SHOW_TEXT,
      function (node) {
        var ignore = {
          "STYLE": 0,
          "SCRIPT": 0,
          "NOSCRIPT": 0,
          "IFRAME": 0,
          "OBJECT": 0,
          "INPUT": 0,
          "FORM": 0,
          "TEXTAREA": 0
        };
        if (node.parentElement.tagName in ignore) {
          return NodeFilter.FILTER_REJECT;
        }
        return node.textContent.trim() !== "" ?
            NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      });
  while ((node = iter.nextNode())) {
    console.log(node.parentElement.id);
  }
}

test();
chrome.runtime.onMessage.addListener(getID);
