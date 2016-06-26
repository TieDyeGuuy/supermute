var ON_HAND = 1;
var KNOW_LOCAL = 2;
var IS_LOCAL = 4;
var UPLOAD = 8;
var ABORT = 16;
var RESTART = 32;
var hate = null;
var hatestatus = 0;
var broken = false;

/* 1  - is it on hand
 * 2  - do we know if it is locally stored?
 * 4  - is it locally stored?
 * 8  - was upload successful?
 * 16 - was upload aborted?*/

function generateSorter(filters) {
  return function(item) {
    for(var prop in filters) {
      switch(prop) {
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

function start(status) {
  if(chrome.runtime.lastError) {
    console.log(chrome.runtime.lastError);
    hatestatus = hatestatus | RESTART;
  } else if(status.hasOwnProperty("hatestatus")) {
    hatestatus = status.hatestatus;
    console.log("retireved hatestatus: " + hatestatus);
  } else {
    chrome.storage.local.set({"hatestatus": hatestatus});
    console.log("set hatestatus: " + hatestatus);
  }
  // do we have hatedata on hand?
  if(hatestatus & ON_HAND === ON_HAND) {
    if(hate == null) {
      hatestatus -= ON_HAND;
    } else {
      return;
    }
  }
  // do we know where hatedata is?
  if(hatestatus & (KNOW_LOCAL + IS_LOCAL) === KNOW_LOCAL) {
    uploadHate();
  } else {
    chrome.storage.local.get("hatedata", ensureData);
  }
}

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

function ensureData(data) {
  if(chrome.runtime.lastError) {
    console.log(chrome.runtime.lastError);
    uploadHate();
  } else {
    var local = null;
    try {
      local = data.hasOwnProperty("hatedata");
    } catch (e) {
      console.log("local hatedata is dead.");
      local = false;
    }
    if(local) {
      hate = data.hatedata;
      console.log("discovered hatedata locally: " + hate.status);
      hatestatus = hatestatus | (ON_HAND + KNOW_LOCAL + IS_LOCAL);
      chrome.storage.local.set({"hatestatus": hatestatus});
    } else {
      console.log("hatedata is not local.");
      hatestatus = hatestatus | KNOW_LOCAL;
      hatestatus = hatestatus & ~IS_LOCAL;
      uploadHate();
    }
  }
}

function transferComplete() {
  hate = JSON.parse(this.responseText);
  hatestatus = hatestatus | (ON_HAND + UPLOAD);
  hatestatus = hatestatus & ~ABORT;
  console.log("retrieved hatedata: " + hate.status);
  console.log("setting hatestatus: " + hatestatus);
  chrome.storage.local.set({"hatestatus": hatestatus});
  if((hatestatus & (KNOW_LOCAL + IS_LOCAL)) != (KNOW_LOCAL + IS_LOCAL)) {
    console.log("setting hatedata");
    chrome.storage.local.set({"hatedata": hate}, onSet);
  }
}

function transferFailed() {
  hatestatus = hatestatus & ~(UPLOAD + ABORT);
  console.log("unable to upload hatedata.");
  if(hatestatus & RESTART === 0) {
    hatestatus += RESTART;
    console.log("trying to store hatestatus: " + hatestatus);
    chrome.storage.local.set({"hatestatus": hatestatus}, statusSet);
  } else {
    broken = true;
    console.log("something went terribly wrong.");
  }
}

function transferCanceled() {
  hatestatus = hatestatus | ABORT;
  hatestatus = hatestatus & ~UPLOAD;
  console.log("upload of hatedata was stopped.");
  if(hatestatus & RESTART === 0) {
    hatestatus += RESTART;
    console.log("trying to store hatestatus: " + hatestatus);
    chrome.storage.local.set({"hatestatus": hatestatus}, statusSet);
  } else {
    broken = true;
    console.log("something went terribly wrong.");
  }
}

function onSet() {
  if(chrome.runtime.lastError) {
    console.log(chrome.runtime.lastError);
  } else {
    hatestatus = hatestatus | (KNOW_LOCAL + IS_LOCAL);
    console.log("stored hatedata locally.");
    console.log("storing hatestatus: " + hatestatus);
    chrome.storage.local.set({"hatestatus": hatestatus});
  }
}

function statusSet() {
  if(chrome.runtime.lastError) {
    console.log(chrome.runtime.lastError);
    broken = true;
  } else {
    console.log("reloading addon.");
    chrome.runtime.reload();
  }
}

console.log("getting hatestatus");
chrome.storage.local.get("hatestatus", start);
