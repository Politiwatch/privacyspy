window.onload = function () {
  var dropdownOpen = false;
  var menu = document.getElementById("nav-menu");
  var burger = document.getElementById("burger");
  var cross = document.getElementById("cross");

  document.getElementById("dropdown-button").onclick = function () {
    menu.className = dropdownOpen ? "lg:block hidden" : "lg:block block";
    burger.style.display = !dropdownOpen ? "block" : "none";
    cross.style.display = dropdownOpen ? "block" : "none";
    dropdownOpen = !dropdownOpen;
  };
};
