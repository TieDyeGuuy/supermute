var debug = true;

function test() {
  if (debug) {console.log(document.URL);}
}

function getID(message) {
  var node, iter;

  function getSignature(node) {
    var signature = [], element = node.parentElement
    if (element.id === "" && element.tagName !== "body") {
      signature = signature.concat(getSignature(element));
      if (element.className === "") {
        signature.push({
          "type": "tag",
          "name": element.tagName
        });
      } else {
        signature.push({
          "type": "class",
          "name": element.className
        });
      }
    } else {
      if (element.tagName === "body") {
        signature.push({
          "type": "tag",
          "name": "body"
        });
      } else {
        signature.push({
          "type": "id",
          "name": element.id
        });
      }
    }
    return signature;
  }

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
    var sig = getSignature(node).map(function (item) {
      return item.name;
    }).toString();
    if (debug) {console.log(sig);}
  }
}

test();
chrome.runtime.onMessage.addListener(getID);
chrome.runtime.sendMessage(null);
