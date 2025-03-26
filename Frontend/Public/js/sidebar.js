document.addEventListener("DOMContentLoaded", function () {
    document.getElementById("toggleSidebar").addEventListener("click", function () {
        document.querySelector(".sidebar").classList.toggle("hidden");
    });

    document.getElementById("closeSidebar").addEventListener("click", function () {
        document.querySelector(".sidebar").classList.toggle("hidden");
    });
});