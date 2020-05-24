// Opera 8.0+
var isOpera =
  (!!window.opr && !!opr.addons) ||
  !!window.opera ||
  navigator.userAgent.indexOf(" OPR/") >= 0;

// Firefox 1.0+
var isFirefox = typeof InstallTrigger !== "undefined";

// Safari 3.0+ "[object HTMLElementConstructor]"
var isSafari =
  /constructor/i.test(window.HTMLElement) ||
  (function (p) {
    return p.toString() === "[object SafariRemoteNotification]";
  })(
    !window["safari"] ||
      (typeof safari !== "undefined" && safari.pushNotification)
  );

// Internet Explorer 6-11
var isIE = /*@cc_on!@*/ false || !!document.documentMode;

// Edge 20+
var isEdge = !isIE && !!window.StyleMedia;

// Chrome 1 - 71
var isChrome =
  !!window.chrome && (!!window.chrome.webstore || !!window.chrome.runtime);

// Blink engine detection
var isBlink = (isChrome || isOpera) && !!window.CSS;

function installBrowserExtension() {
  if (isChrome) {
    window.open(
      "https://chrome.google.com/webstore/detail/ppembnadnhiknioggbglgiciihgmkmnd",
      "_blank"
    );
  } else if (isFirefox) {
    window.open(
      "https://addons.mozilla.org/en-US/firefox/addon/privacyspy/",
      "_blank"
    );
  } else {
    alert(
      "We can't detect your browser! To install the PrivacySpy extension, please navigate to the appropriate extension marketplace for your browser and install it."
    );
  }
}
