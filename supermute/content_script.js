var debug = true, port;

/* this function is literally just to make sure that the content_script got
 * inserted into the propper tab and is able to function in a basic way.*/
function test() {
  if (debug) {console.log(document.URL);}
}

/* for now this function takes in pejorative words from the hatebase and then
 * searches the website to see if the site has any of the pejorative words.
 * WARNING this might be a temporary use of this function. It is not very well
 * defined just yet.*/
function getID(words) {
  var node, iter;
  iter = document.createNodeIterator(
      document.body,
      NodeFilter.SHOW_TEXT,
      customFilter);

  while ((node = iter.nextNode())) {
    var found, sig, word;
    found = false;
    for(word of words) {
      if (node.textContent.toLowerCase().indexOf(
            word.vocabulary.toLowerCase()) !== -1) {
        found = true;
        break;
      }
    }
    if (found) {
      sig = getSignature(node).map(function (item) {
        return item.name;
      }).toString();
      if (debug) {console.log(sig);}
    }
  }
}

/* This is a function specifically for createNodeIterator that helps the
 * iterator find relevant nodes and ignore effectively invisible nodes.*/
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

/* This function given a node in an HTML file will return the unique signature
 * of the relevant node.
 * TODO improve this so it returns more info that could be used by jQuery
 * eventually.*/
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

/* Listens for when the background script tries to connect.*/
function connectListen(p) {
  if (debug) {console.log("connect success port: " + p.name);}
  port = p;
  port.onMessage.addListener(portListen);
}

/* Listens for messages from the background script. So far this function will
 * respond to a request to get info about the website (or is ready to do so)
 * and also will start searching for words that the background script sends
 * to the function.*/
function portListen(m) {
  if (!m["message"]) {
    return;
  }
  if (debug) {console.log("port message received inside tab " + port.name);}
  switch (m.message) {
    case "info":
      if (debug) {console.log("info");}
      port.postMessage({
        "message": "filters",
        "filters": getInfo(),
        "port": port.name
      });
      break;
    case "words":
      if (debug) {console.log("words");}
      getID(m.words);
      break;
  }
}

/* Eventually this function will get relevant country and context from the
 * website.*/
function getInfo() {
  // TODO find country information and meta data tags
  return {
    "starts_with": "ap",
    "mild": "1",
    "about_ethnicity": "1"
  }
}

// do stuff.
test();
chrome.runtime.onMessage.addListener(getID);
chrome.runtime.onConnect.addListener(connectListen);
chrome.runtime.sendMessage(null);
