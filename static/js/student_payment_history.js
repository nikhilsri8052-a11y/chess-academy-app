document.getElementById('monthFilter').addEventListener('change', function () {
    const filterValue = this.value; // YYYY-MM
    const rows = document.querySelectorAll('.payment-row');
    let visibleCount = 0;

    rows.forEach(row => {
        const rowMonth = row.dataset.month;

        if (!filterValue || rowMonth === filterValue) {
            row.style.display = '';
            visibleCount++;
        } else {
            row.style.display = 'none';
        }
    });

    document.getElementById('totalCount').textContent = visibleCount;
});

function clearFilter() {
    document.getElementById('monthFilter').value = '';
    const rows = document.querySelectorAll('.payment-row');
    rows.forEach(row => row.style.display = '');
    document.getElementById('totalCount').textContent = rows.length;
}
