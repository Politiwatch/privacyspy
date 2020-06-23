// MOBILE DROPDOWNS

function closeAllMobileDropdowns() {
  document.querySelectorAll(".mobile-dropdown").forEach((dropdown) => {
    dropdown.classList.add("hidden");
  });
}

function toggleMobileDropdown(id) {
  console.log("Toggling " + id);
  let comp = document.getElementById(id);
  if (comp.classList.contains("hidden")) {
    closeAllMobileDropdowns();
    comp.classList.remove("hidden");
    if (document.querySelector("." + id + "-focus") !== null) {
      document.querySelector("." + id + "-focus").focus();
    }
  } else {
    comp.classList.add("hidden");
  }
}

function hasParentOfClass(element, classname) {
  if (element === document) {
    return false;
  }
  if (element.classList.contains(classname)) return true;
  return element.parentNode && hasParentOfClass(element.parentNode, classname);
}

window.addEventListener("click", (ev) => {
  if (
    !(
      hasParentOfClass(ev.target, "mobile-dropdown") ||
      hasParentOfClass(ev.target, "dropdown-toggler")
    )
  ) {
    closeAllMobileDropdowns();
  }
});

// RUBRIC EXPANSIONS

function toggleRubricSelection(index) {
  let element = document.getElementById("selection-" + index);
  let chevron = document.getElementById("chevron-" + index);
  if (element.classList.contains("hidden")) {
    element.classList.remove("hidden");
    element.classList.add("block");
    chevron.classList.remove("fa-chevron-down");
    chevron.classList.add("fa-chevron-up");
  } else {
    element.classList.remove("block");
    element.classList.add("hidden");
    chevron.classList.remove("fa-chevron-up");
    chevron.classList.add("fa-chevron-down");
  }
}
