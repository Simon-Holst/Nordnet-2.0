// Venter på DOM indlæsning
document.addEventListener("DOMContentLoaded", function () {
// Henter knapperne fra HTML og toggler hidden
    document.getElementById("toggleSidebar").addEventListener("click", function () {
        document.querySelector(".sidebar").classList.toggle("hidden");
    });
// Henter knappen til lukning af sidebar og toggler hidden
    document.getElementById("closeSidebar").addEventListener("click", function () {
        document.querySelector(".sidebar").classList.toggle("hidden");
    });
});