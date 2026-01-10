let allMaterials = [];
let currentFilter = 'all';

document.addEventListener('DOMContentLoaded', function() {
    loadMaterials();
    setupFilters();
});

function loadMaterials() {
    const grid = document.getElementById('materialsGrid');
    
    fetch('/student/study-materials')
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                allMaterials = data.materials;
                displayMaterials(allMaterials);
            } else {
                grid.innerHTML = `
                    <div class="empty-state">
                        <i class="ph-warning-circle"></i>
                        <h3>Error Loading Materials</h3>
                        <p>${data.error || 'Please try again later'}</p>
                    </div>
                `;
            }
        })
        .catch(err => {
            console.error('Error loading materials:', err);
            grid.innerHTML = `
                <div class="empty-state">
                    <i class="ph-warning-circle"></i>
                    <h3>Connection Error</h3>
                    <p>Unable to load study materials</p>
                </div>
            `;
        });
}

function displayMaterials(materials) {
    const grid = document.getElementById('materialsGrid');
    
    // Filter materials based on current filter
    const filtered = currentFilter === 'all' 
        ? materials 
        : materials.filter(m => m.type === currentFilter);
    
    if (filtered.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <i class="ph-folder-open"></i>
                <h3>No Materials Found</h3>
                <p>No ${currentFilter === 'all' ? '' : currentFilter + ' '}materials available yet</p>
            </div>
        `;
        return;
    }
    
    let html = '';
    filtered.forEach(material => {
        const typeLabels = {
            'notes': 'Notes',
            'assignment': 'Assignment',
            'video': 'Video',
            'practice': 'Practice',
            'other': 'Other'
        };
        
        html += `
            <div class="material-card">
                <span class="material-type-badge ${material.type}">
                    ${typeLabels[material.type] || 'Material'}
                </span>
                <h3 class="material-title">${escapeHtml(material.title)}</h3>
                <p class="material-description">${escapeHtml(material.description)}</p>
                <div class="material-meta">
                    <span><i class="ph-calendar-blank"></i> ${material.created_at_str}</span>
                    <span><i class="ph-user"></i> ${escapeHtml(material.created_by_name)}</span>
                </div>
                <button class="access-btn" onclick="openMaterial('${escapeHtml(material.link)}')">
                    <i class="ph-arrow-square-out"></i>
                    Open Material
                </button>
            </div>
        `;
    });
    
    grid.innerHTML = html;
}

function setupFilters() {
    const filterBtns = document.querySelectorAll('.filter-btn');
    
    filterBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            // Update active state
            filterBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            // Update current filter
            currentFilter = this.dataset.type;
            
            // Re-display materials
            displayMaterials(allMaterials);
        });
    });
}

function openMaterial(link) {
    window.open(link, '_blank');
}

function escapeHtml(text) {
    if (!text) return '';
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}