function closeHighlights() {
    $("#highlights-modal").removeClass("is-active");
}

function openHighlights() {
    $("#highlights-modal").addClass("is-active");
    $("*[data-score]").each(function () {
        var score = parseFloat($(this).attr("data-score"));
        if(score > 0.2){
            $(this).addClass("highlights-is-highlighted");
        }
    })
}