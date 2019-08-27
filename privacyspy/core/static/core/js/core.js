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