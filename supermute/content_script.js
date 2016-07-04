var debug = true;

if (debug) {console.log("debug");}

chrome.runtime.sendMessage({
  "request": "words",
  "filters": {
    "mild": "1",
    "starts_with": "ap",
    "about_ethnicity": "1"
  }
});
