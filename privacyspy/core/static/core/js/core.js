function toggleRubricSelection(element) {
    if ($(element).is(":visible")) {
        $(element).slideUp();
        $(element + "-icon").removeClass("fa-chevron-up").addClass("fa-chevron-down");
    } else {
        $(element).slideDown();
        $(element + "-icon").removeClass("fa-chevron-down").addClass("fa-chevron-up");
    }
}