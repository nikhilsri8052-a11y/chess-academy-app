document.addEventListener('DOMContentLoaded', function() {
    loadMaterials();
    setupMaterialForm();
});

function loadMaterials() {
    fetch('/admin/study-materials/list')
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                displayMaterials(data.materials);
            }
        })
        .catch(err => console.error('Error loading materials:', err));
}

function displayMaterials(materialsByBatch) {
    const batches = ['all', 'online1', 'online2', 'offline_advance', 'offline_base'];
    
    // Icon mapping for types
    const typeIcons = {
        notes: 'ph-notepad',
        assignment: 'ph-clipboard-text',
        video: 'ph-video-camera',
        practice: 'ph-brain',
        other: 'ph-archive'
    };

    batches.forEach(batch => {
        const container = document.getElementById(`materials-${batch}`);
        const countBadge = document.getElementById(`count-${batch}`);
        const materials = materialsByBatch[batch] || [];
        
        if (countBadge) countBadge.textContent = materials.length;
        if (!container) return;

        if (materials.length === 0) {
            container.innerHTML = `<div class="empty-state">No materials found</div>`;
            return;
        }
        
        let html = '';
        materials.forEach(item => {
            // 1. Determine Batch Class (for border color)
            const batchClass = `batch-${item.batch}`; 

            // 2. Determine Type Class (for badge color)
            // Default to 'other' if type is unknown
            const typeKey = (item.type || 'other').toLowerCase();
            const typeClass = `type-${typeKey}`;
            
            // 3. Get Icon
            const iconClass = typeIcons[typeKey] || 'ph-file';

            html += `
                <div class="material-card ${batchClass}" id="material-${item.id}">
                    <div class="card-top">
                        <span class="type-badge ${typeClass}">
                            <i class="${iconClass}"></i>
                            ${capitalize(item.type)}
                        </span>
                        <button class="delete-btn" onclick="deleteMaterial('${item.id}')">
                            <i class="ph-trash"></i>
                        </button>
                    </div>
                    <div class="card-title"><strong>${escapeHtml(item.title)}</strong></div>
                    <p>${escapeHtml(item.description)}</p>
                    <div class="card-footer">
                        <a href="${item.link}" target="_blank" class="btn-link">
                            <i class="ph-arrow-square-out"></i> Open
                        </a>
                        <span>${item.created_at_str}</span>
                    </div>
                </div>`;
        });
        container.innerHTML = html;
    });
}

// Helper function to capitalize first letter
function capitalize(str) {
    if(!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function setupMaterialForm() {
    // FIX: Changed ID from 'createMaterialForm' to 'uploadMaterialForm' to match HTML
    const form = document.getElementById('uploadMaterialForm'); 
    if (!form) return;

    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const btn = form.querySelector('.btn-submit');
        const originalText = btn.innerHTML; // Save original button content
        btn.disabled = true;
        btn.innerHTML = '<span class="btn-text">Uploading...</span> <i class="ph-spinner ph-spin"></i>';

        const payload = {
            title: document.getElementById('materialTitle').value.trim(),
            description: document.getElementById('materialDescription').value.trim(),
            link: document.getElementById('materialLink').value.trim(),
            batch: document.getElementById('materialBatch').value,
            type: document.getElementById('materialType').value
        };

        fetch('/admin/study-materials/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                form.reset();
                loadMaterials();
                // Optional: Show a success toast or alert
                alert('Material uploaded successfully!');
            } else {
                alert('Error: ' + data.error);
            }
        })
        .catch(err => {
            console.error(err);
            alert('An error occurred while uploading.');
        })
        .finally(() => {
            btn.disabled = false;
            btn.innerHTML = originalText;
        });
    });
}

function deleteMaterial(id) {
    if (!confirm('Are you sure you want to delete this material?')) return;
    
    fetch(`/admin/study-materials/delete/${id}`, { method: 'POST' })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                loadMaterials();
            } else {
                alert('Error deleting material');
            }
        });
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}