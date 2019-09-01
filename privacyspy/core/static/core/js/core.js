function toggleRubricSelection(element) {
  if ($(element).is(":visible")) {
    $(element).slideUp();
    $(element + "-icon").removeClass("fa-chevron-up").addClass("fa-chevron-down");
  } else {
    $(element).slideDown();
    $(element + "-icon").removeClass("fa-chevron-down").addClass("fa-chevron-up");
  }
}

function showHighlights() {
  $("#highlights").removeClass("is-collapsed");
  $(".expand-highlights").hide();
}

document.addEventListener('DOMContentLoaded', () => {

  $(".is-collapsed").click(showHighlights);
  $("button[type=submit]").click(function () {
    $(this).addClass("is-loading");
  });
  $("#directory-search").submit(function () {
    $("#directory-search-icon").removeClass("fa-search").addClass("fa-cog").addClass("fa-spin");
  });

  // Get all "navbar-burger" elements
  const $navbarBurgers = Array.prototype.slice.call(document.querySelectorAll('.navbar-burger'), 0);

  // Check if there are any navbar burgers
  if ($navbarBurgers.length > 0) {

    // Add a click event on each of them
    $navbarBurgers.forEach(el => {
      el.addEventListener('click', () => {

        // Get the target from the "data-target" attribute
        const target = el.dataset.target;
        const $target = document.getElementById(target);

        // Toggle the "is-active" class on both the "navbar-burger" and the "navbar-menu"
        el.classList.toggle('is-active');
        $target.classList.toggle('is-active');

      });
    });
  }

});

// From https://stackoverflow.com/questions/9847580/how-to-detect-safari-chrome-ie-firefox-and-opera-browser?rq=1

// Opera 8.0+
var isOpera = (!!window.opr && !!opr.addons) || !!window.opera || navigator.userAgent.indexOf(' OPR/') >= 0;

// Firefox 1.0+
var isFirefox = typeof InstallTrigger !== 'undefined';

// Safari 3.0+ "[object HTMLElementConstructor]" 
var isSafari = /constructor/i.test(window.HTMLElement) || (function (p) { return p.toString() === "[object SafariRemoteNotification]"; })(!window['safari'] || (typeof safari !== 'undefined' && safari.pushNotification));

// Internet Explorer 6-11
var isIE = /*@cc_on!@*/false || !!document.documentMode;

// Edge 20+
var isEdge = !isIE && !!window.StyleMedia;

// Chrome 1 - 71
var isChrome = !!window.chrome && (!!window.chrome.webstore || !!window.chrome.runtime);

// Blink engine detection
var isBlink = (isChrome || isOpera) && !!window.CSS;

function installBrowserExtension(){
  if(isChrome){
    window.open('https://chrome.google.com/webstore/detail/ppembnadnhiknioggbglgiciihgmkmnd', '_blank'); 
  }else if(isFirefox){
    window.open('https://addons.mozilla.org/en-US/firefox/addon/privacyspy/', '_blank'); 
  }else{
    alert("We can't detect your browser! To install the PrivacySpy extension, please navigate to the appropriate extension marketplace for your browser and install it.");
  }
}