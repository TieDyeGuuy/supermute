/* new strategy based on:
 * https://github.com/Posnet/xkcd-substitutions
 */

var debug = true, ports = {};

function fixDataCorruption() {
  if (debug) {console.log("update store");}
  chrome.storage.local.get(null, check);
}

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

function uploadHate() {
  var hateURL = chrome.extension.getURL("web_source/hbu.json");
  var xobj = new XMLHttpRequest();
  xobj.addEventListener("load", transferComplete);
  xobj.overrideMimeType("application/json");
  xobj.open('GET', hateURL);
  xobj.send();
}

function transferComplete() {
  if (debug) {console.log("load successful");}
  var hate = JSON.parse(this.responseText);
  chrome.storage.local.set({"hatedata": hate});
}

function bulkInsert(result) {
  if (debug) {console.log("bulkInsert");}
  for (tab of result) {
    insertScript(tab.id);
  }
}

function insertScript(tabId) {
  chrome.tabs.executeScript(tabId, {
    "file": "content_script.js",
    "runAt": "document_end"
  }, function (result) {
    if (debug) {console.log("script executed in tab: " + tabId);}
  });
}

function connectPorts(message, sender, sendResponse) {
  var id, port;
  id = sender.tab.id;
  if (debug) {console.log("port connect: " + id);}
  port = chrome.tabs.connect(id, {
    name: id.toString()
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
          if (filters[prop] && item.offensiveness > 0.0) {
            return false;
          } else if (!filters[prop] && item.offensiveness === 0.0) {
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

// 999. do stuff
fixDataCorruption();
chrome.tabs.query({url: "*://*/*"}, bulkInsert);
chrome.runtime.onMessage.addListener(connectPorts)
