function searchAssignments() {
    const input = document.getElementById("searchInput").value.toLowerCase();
    const cards = document.querySelectorAll(".assignment-card");
    let visibleCount = 0;

    cards.forEach(card => {
        const title = card.getAttribute("data-title");
        if (title.includes(input)) {
            card.style.display = "block";
            visibleCount++;
        } else {
            card.style.display = "none";
        }
    });

    const container = document.getElementById("assignmentsContainer");
    const existing = document.getElementById("noResultText");

    if (visibleCount === 0 && !existing) {
        const div = document.createElement("div");
        div.id = "noResultText";
        div.className = "no-results";
        div.innerText = "No matching assignments found.";
        container.appendChild(div);
    } else if (visibleCount > 0 && existing) {
        existing.remove();
    }
}
