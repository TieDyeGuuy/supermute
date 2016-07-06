var debug = true, port;

function test() {
  if (debug) {console.log(document.URL);}
}

function getID(message) {
  var node, iter;

  iter = document.createNodeIterator(
      document.body,
      NodeFilter.SHOW_TEXT,
      customFilter);
  while ((node = iter.nextNode())) {
    var sig = getSignature(node).map(function (item) {
      return item.name;
    }).toString();
    if (debug) {console.log(sig);}
  }
}

function customFilter(node) {
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
}

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

function connectListen(p) {
  if (debug) {console.log("connect success port: " + p.name);}
  port = p;
  port.onMessage.addListener(portListen);
}

function portListen(m) {
  if (!m["message"]) {
    return;
  }
  if (debug) {console.log("port message received tab " + port.name);}
  switch (m.message) {
    case "info":
      port.postMessage({
        message: "filters",
        filters: getInfo()
      });
      break;
  }
}

function getInfo() {
  return {
    "starts_with": "ap",
    "mild": "1",
    "about_ethnicity": "1"
  }
}

test();
chrome.runtime.onMessage.addListener(getID);
chrome.runtime.onConnect.addListener(connectListen);
chrome.runtime.sendMessage(null);
