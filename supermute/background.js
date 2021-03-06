var debug = true, ports = {};

/* starts a check to make sure that hatedata is stored locally.*/
function fixDataCorruption() {
  if (debug) {console.log("update store");}
  chrome.storage.local.get(null, check);
}

/* this runs the actual check. If the data is not local or it is corrupted
 * somehow it gets the data from the file that is bundled with the addon.*/
function check(result) {
  if (!result["hatedata"]) {
    uploadHate();
  } else {
    try {
      var status = result.hatedata.status;
      if (debug) {
        console.log("status: " + status);
        console.log("data already here");
      }
    } catch (e) {
      uploadHate();
    }
  }
}

/* This is the function that will retrieve the hatebase data from the local
 * file.*/
function uploadHate() {
  var hateURL = chrome.extension.getURL("web_source/hbu.json");
  var xobj = new XMLHttpRequest();
  xobj.addEventListener("load", transferComplete);
  xobj.overrideMimeType("application/json");
  xobj.open('GET', hateURL);
  xobj.send();
}

/* upon a successful load of the hatebase data stored in the local file, store
 * the hatebase data locally so that the user may add new data as they see fit.
 */
function transferComplete() {
  if (debug) {console.log("load successful");}
  var hate = JSON.parse(this.responseText);
  chrome.storage.local.set({"hatedata": hate});
}

/* Takes all relevant tabs and inserts the main content_script.*/
function bulkInsert(result) {
  if (debug) {console.log("bulkInsert");}
  for (tab of result) {
    insertScript(tab.id);
  }
}

/* This is the listener function for when the content_script is ready to
 * connect via port. It creates the relevant port then stores it in the
 * variable ports along with other relevant information.
 * TODO explain ports object structure and purpose.*/
function connectPorts(message, sender, sendResponse) {
  var id, port;
  id = sender.tab.id;
  if (debug) {console.log("port connect: " + id);}
  // create port
  port = chrome.tabs.connect(id, {
    name: id.toString()
  });
  // setup port data
  ports[id.toString()] = {
    "port": port,
    "url": sender.url,
    "unchanged": true,
    "sensored": false
  }
  // set up port listeners
  port.onMessage.addListener(portListener);
  port.onDisconnect.addListener(function () {
    if (debug) {console.log("disconnecting port " + id);}
    delete ports[id.toString()];
  });
  // initiate sensoring if the tab is active.
  if (sender.tab.active) {
    activeListener({
      "tabId": id
    });
  }
}

/* This function listens for messages from a port. It utilizes the port name
 * in order to know where to send messages back to.*/
function portListener(m) {
  if (!m["message"]) {
    return;
  }
  if (debug) {console.log("port message received from tab " + m.port);}

  switch (m.message) {
    case "filters":
      function getVocab(wrap) {
        var words = wrap.hatedata.data.datapoint.filter(
              generateSorter(m.filters));
        ports[m.port].port.postMessage({
          "message": "words",
          "words": words
        });
      }
      chrome.storage.local.get("hatedata", getVocab);
      break;
  }
}

/* This function is the listener for when any tab updates.
 * TODO explain this better*/
function updateListener(tabId, changeInfo, tab) {
  var sid = tabId.toString(), urlMatch, complete;
  urlMatch = ports[sid] && ports[sid].url === tab.url;
  complete = tab.status === "complete";
  if (urlMatch) {
    if (debug) {console.log("script already here in tab " + tabId);}
    ports[sid].unchanged = false;
    if (!complete) {
      ports[sid].sensored = false;
    }
  } else if (complete) {
    if (debug) {console.log("insert new script in tab " + tabId);}
    insertScript(tabId);
  } else {
    // TODO make sure risky urls are hidden.
  }
}

/* this does the actual script insertion.*/
function insertScript(tabId) {
  chrome.tabs.executeScript(tabId, {
    "file": "content_script.js",
    "runAt": "document_end"
  }, function (result) {
    if (debug) {console.log("script executed in tab: " + tabId);}
  });
}

/* This listens for when a tab is activated and determines whether or not to
 * initiate searching the HTML file for pejorative words from the hatebase.*/
function activeListener(activeInfo) {
  if (debug) {console.log("chain of messages activated tab "
                          + activeInfo.tabId);}
  // TODO figure out if tab needs updating.
  ports[activeInfo.tabId.toString()].port.postMessage({
    message: "info"
  });
}

/* as of right now filters are any property of a datapoint in hbu.json
 * the relevant possibilities are as follows:
 * about_class, about_disability, about_ethnicity, about_gender,
 * about_nationality, about_religion, about_sexual_orientation, archaic,
 * number_of_variants, offensiveness, other_meaning, and small_acronym.
 *
 * support for the following filters will come soon:
 * primary_contexts, primary_location, variant_of
 *
 * the parameter filters should be an object where each key is one of the
 * property names listed above and each value is the desired value.
 *
 * the function returns a filter function so that it is easy to filter the
 * datapoint array. More explicitly if you check out this page:
 * http://www.w3schools.com/jsref/jsref_filter.asp
 * then the result of this function is what you would pass to the filter
 * function for example:
 * hate.data.datapoint.filter(generateSorter({"offensiveness": .5,
                                              "about_class": "1"}));
 * would return an array of all words in the hatebase with an offensiveness
 * greater than or equal to .5 and are about class.*/
function generateSorter(filters) {
  return function(item) {
    for(var prop in filters) {
      switch(prop) {
        // TODO create cases for primary_contexts, primary_location
        // and variant_of.
        case "offensiveness":
          if(item[prop] < filters[prop]) {
            return false;
          }
          break;
        case "starts_with":
          if (!item.vocabulary.toLowerCase().startsWith(
              filters[prop].toLowerCase())) {
            return false;
          }
          break;
        case "mild":
          if (filters[prop] === "1" && item.offensiveness > 0.0) {
            return false;
          } else if (filters[prop] === "0" && item.offensiveness === 0.0) {
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

// do stuff
fixDataCorruption();
chrome.tabs.query({url: "*://*/*"}, bulkInsert);
chrome.runtime.onMessage.addListener(connectPorts);
chrome.tabs.onUpdated.addListener(updateListener);
chrome.tabs.onActivated.addListener(activeListener);
