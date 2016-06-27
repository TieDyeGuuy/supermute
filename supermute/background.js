var ON_HAND = 1;
var KNOW_LOCAL = 2;
var IS_LOCAL = 4;
var UPLOAD = 8;
var ABORT = 16;
var RESTART = 32;
var hate = null;
var hatestatus = 0;

/* 1  - is it on hand
 * 2  - do we know if it is locally stored?
 * 4  - is it locally stored?
 * 8  - was upload successful?
 * 16 - was upload aborted?
 * 32 - have we tried restarting?*/

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
        default:
          if(!(item[prop] === filters[prop])) {
            return false;
          }
      }
    }
    return true;
  };
}

/* This should be what happens first when the addon starts.*/
function start(status) {
  if(chrome.runtime.lastError) { // if we had trouble getting the status.
    console.log(chrome.runtime.lastError);
    hatestatus = hatestatus | RESTART; // assume we restarted.
  } else if(status.hasOwnProperty("hatestatus")) { // if status is local.
    hatestatus = status.hatestatus; // get most up to date status.
  } else {
    chrome.storage.local.set({"hatestatus": hatestatus});
  }
  if(hatestatus & ON_HAND === ON_HAND) {
    if(hate == null) {
      hatestatus -= ON_HAND;
    } else {
      return;
    }
  }
  if(hatestatus & (KNOW_LOCAL + IS_LOCAL) === KNOW_LOCAL) {
    uploadHate();
  } else {
    chrome.storage.local.get("hatedata", localHateGet);
  }
}

/* This function takes the information from hbu.json and makes it accessible
 * to the addon.*/
function uploadHate() {
  var hateURL = chrome.extension.getURL("web_source/hbu.json");
  var xobj = new XMLHttpRequest();
  xobj.addEventListener("load", transferComplete);
  xobj.addEventListener("error", transferFailed);
  xobj.addEventListener("abort", transferCanceled);
  xobj.overrideMimeType("application/json");
  xobj.open('GET', hateURL);
  xobj.send();
}

/* This function should only be called after an attempt to retrieve hatedata
 * locally. If the retrieval is unsuccessful for any reason it tries to
 * upload the content from the addon data. If the retrieval is successful then
 * nothing more need be done.*/
function localHateGet(data) {
  if(chrome.runtime.lastError) {
    console.log(chrome.runtime.lastError);
    uploadHate();
  } else {
    var local = null;
    try {
      local = data.hasOwnProperty("hatedata");
    } catch (e) {
      local = false;
    }
    if(local) {
      hate = data.hatedata;
      hatestatus = hatestatus | (ON_HAND + KNOW_LOCAL + IS_LOCAL);
      hatestatus = hatestatus & ~RESTART;
      chrome.storage.local.set({"hatestatus": hatestatus});
    } else {
      hatestatus = hatestatus | KNOW_LOCAL;
      hatestatus = hatestatus & ~IS_LOCAL;
      uploadHate();
    }
  }
}

/* This function is called if an upload from the addon data is successful.
 * If hatedata is not stored locally then it attempts to store it locally.*/
function transferComplete() {
  hate = JSON.parse(this.responseText);
  hatestatus = hatestatus | (ON_HAND + UPLOAD);
  hatestatus = hatestatus & ~(ABORT + RESTART);
  chrome.storage.local.set({"hatestatus": hatestatus});
  if((hatestatus & (KNOW_LOCAL + IS_LOCAL)) != (KNOW_LOCAL + IS_LOCAL)) {
    chrome.storage.local.set({"hatedata": hate}, storeHate);
  }
}

/* This function is called if an upload from the addon data fails. If a reload
 * has not been attempted yet, then the function attempts a reload. If a reload
 * has been attempted then an error is thrown.*/
function transferFailed() {
  hatestatus = hatestatus & ~(UPLOAD + ABORT);
  if(hatestatus & RESTART === 0) {
    hatestatus += RESTART;
    chrome.storage.local.set({"hatestatus": hatestatus}, restart);
  } else {
    var message = "Unable to load hatedata. Status: " + interpretStatus();
    throw new Error(message);
  }
}

/* This function is called if an upload from the addon data is canceled by the
 * user somehow. If a reload has not been attempted yet, then the function
 * attempts a reload. If a reload has been attempted then an error is thrown.*/
function transferCanceled() {
  hatestatus = hatestatus | ABORT;
  hatestatus = hatestatus & ~UPLOAD;
  if(hatestatus & RESTART === 0) {
    hatestatus += RESTART;
    chrome.storage.local.set({"hatestatus": hatestatus}, restart);
  } else {
    var message = "Unable to load hatedata. Status: " + interpretStatus();
    throw new Error(message);
  }
}

/* This function is called after a successful upload of the hatebase from the
 * addon data. Additionally it is intended to only be called if it is known
 * hatedata is not stored locally. It stores hate locally*/
function storeHate() {
  if(chrome.runtime.lastError) {
    console.log(chrome.runtime.lastError);
  } else {
    hatestatus = hatestatus | (KNOW_LOCAL + IS_LOCAL);
    hatestatus = hatestatus & ~RESTART;
    console.log("status: " + interpretStatus());
    chrome.storage.local.set({"hatestatus": hatestatus});
  }
}

/* This function should only be called when attempting to reload the addon.
 * If there is an error storing hatestatus then an error is thrown.
 * If there is no error storing hatestatus then the reload occurs.*/
function restart() {
  if(chrome.runtime.lastError) {
    console.log(chrome.runtime.lastError);
    var message = "Unable to load hatedata. Status: " + interpretStatus();
    throw new Error(message);
  } else {
    chrome.runtime.reload();
  }
}

/* interprets the current hatestatus flags in an understandable way.*/
function interpretStatus(status = hatestatus) {
  var m = "";
  if(status & ON_HAND) {
    m += "hatedata is on hand, ";
  }
  if(!(status & KNOW_LOCAL)) {
    m += "whether or not hatedata is local is unknown, ";
  } else if (status & IS_LOCAL) {
    m += "hatedata is stored locally, ";
  } else {
    m += "hatedata is not stored locally, ";
  }
  if(status & UPLOAD) {
    m += "hatedata was uploaded, ";
  } else if(status & ABORT) {
    m += "hatedata upload was aborted, ";
  } else {
    m += "hatedata upload failed, ";
  }
  if(status & RESTART) {
    m += "a restart was attempted.";
  } else {
    m += "no restart.";
  }
  return m;
}

chrome.storage.local.get("hatestatus", start);
