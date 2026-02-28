document.addEventListener('DOMContentLoaded', () => {
    // Basic Elements
    const fileInput = document.getElementById('subtractionFiles');
    const dropArea = document.getElementById('dropArea');
    const fileListContainer = document.getElementById('fileListContainer');

    const form = document.getElementById('generateForm');
    const submitBtn = document.getElementById('submitBtn');
    const btnText = submitBtn.querySelector('.btn-text');
    const loader = submitBtn.querySelector('.loader');

    const alertBox = document.getElementById('alertBox');
    const alertMsg = document.getElementById('alertMsg');

    // Category Elements
    const categoriesList = document.getElementById('categoriesList');
    const categoryCount = document.getElementById('categoryCount');
    const categorySearch = document.getElementById('categorySearch');
    const btnSelectAll = document.getElementById('btnSelectAll');
    const btnSelectNone = document.getElementById('btnSelectNone');
    const btnInvertSelection = document.getElementById('btnInvertSelection');

    let selectedFiles = []; // Array to store files
    let allCategories = []; // Array of objects {id, name, selected}

    // --- CATEGORY LOGIC ---

    async function fetchCategories() {
        try {
            const response = await fetch('/api/categories');
            if (!response.ok) throw new Error("Failed to fetch categories");
            const data = await response.json();

            // Initialize categories with selected = true
            allCategories = (data.categories || []).map(cat => ({
                id: cat.id,
                name: cat.name,
                selected: true
            }));

            renderCategories();
        } catch (error) {
            console.error(error);
            if (categoriesList) {
                categoriesList.innerHTML = `<li class="error-text" style="color:var(--error); padding:1rem;">Error cargando categorías. Revisa la conexión a BD.</li>`;
            }
        }
    }

    function renderCategories(filterText = '') {
        if (!categoriesList) return;

        categoriesList.innerHTML = '';
        const lowerFilter = filterText.toLowerCase();

        let visibleCount = 0;
        let checkedCount = 0;

        allCategories.forEach((cat, index) => {
            if (cat.selected) checkedCount++;

            if (cat.name.toLowerCase().includes(lowerFilter) || cat.id.toLowerCase().includes(lowerFilter)) {
                visibleCount++;
                const li = document.createElement('li');
                li.className = 'category-item';

                li.innerHTML = `
                    <input type="checkbox" id="cat_${index}" value="${cat.name}" ${cat.selected ? 'checked' : ''}>
                    <label for="cat_${index}" title="${cat.name}">${cat.name}</label>
                `;

                const checkbox = li.querySelector('input');
                checkbox.addEventListener('change', (e) => {
                    cat.selected = e.target.checked;
                    updateCategoryCount();
                });

                categoriesList.appendChild(li);
            }
        });

        if (visibleCount === 0) {
            categoriesList.innerHTML = `<li style="padding:1rem; color:var(--text-muted); font-size:0.875rem;">No se encontraron categorías.</li>`;
        }

        updateCategoryCount();
    }

    function updateCategoryCount() {
        if (!categoryCount) return;
        const total = allCategories.length;
        const checkedCount = allCategories.filter(c => c.selected).length;
        categoryCount.textContent = `${checkedCount} / ${total}`;
    }

    if (categorySearch) {
        categorySearch.addEventListener('input', (e) => {
            renderCategories(e.target.value);
        });
    }

    if (btnSelectAll) {
        btnSelectAll.addEventListener('click', () => {
            allCategories.forEach(c => c.selected = true);
            renderCategories(categorySearch ? categorySearch.value : '');
        });
    }

    if (btnSelectNone) {
        btnSelectNone.addEventListener('click', () => {
            allCategories.forEach(c => c.selected = false);
            renderCategories(categorySearch ? categorySearch.value : '');
        });
    }

    if (btnInvertSelection) {
        btnInvertSelection.addEventListener('click', () => {
            allCategories.forEach(c => c.selected = !c.selected);
            renderCategories(categorySearch ? categorySearch.value : '');
        });
    }

    // Initialize Categories
    fetchCategories();

    // --- DRAG AND DROP FILE LOGIC ---
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        if (dropArea) dropArea.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        if (dropArea) dropArea.addEventListener(eventName, () => dropArea.classList.add('is-active'), false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        if (dropArea) dropArea.addEventListener(eventName, () => dropArea.classList.remove('is-active'), false);
    });

    if (dropArea) dropArea.addEventListener('drop', handleDrop, false);

    function handleDrop(e) {
        const dt = e.dataTransfer;
        handleFiles(dt.files);
    }

    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            handleFiles(e.target.files);
            fileInput.value = '';
        });
    }

    function handleFiles(files) {
        let validFiles = [];
        Array.from(files).forEach(file => {
            if (file.name.endsWith('.xlsx')) {
                if (!selectedFiles.find(f => f.name === file.name)) {
                    validFiles.push(file);
                }
            } else {
                showAlert(`El archivo "${file.name}" fue ignorado por no ser Excel (.xlsx)`, false);
            }
        });

        if (validFiles.length > 0) {
            selectedFiles = selectedFiles.concat(validFiles);
            hideAlert();
            renderFileList();
        }
    }

    function renderFileList() {
        if (!fileListContainer) return;

        fileListContainer.innerHTML = '';
        if (selectedFiles.length > 0) {
            fileListContainer.classList.remove('hidden');

            selectedFiles.forEach((file, index) => {
                const fileInfoDiv = document.createElement('div');
                fileInfoDiv.className = 'file-info';
                fileInfoDiv.style.marginBottom = '0.5rem';

                fileInfoDiv.innerHTML = `
                    <svg class="file-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><path d="M8 13h2"/><path d="M8 17h2"/><path d="M14 13h2"/><path d="M14 17h2"/></svg>
                    <span class="file-name" style="flex-grow: 1; font-size: 0.875rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${file.name}</span>
                    <button type="button" class="remove-file-btn" data-index="${index}" title="Eliminar archivo" style="background: none; border: none; color: var(--text-muted); cursor: pointer; transition: var(--transition);">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                    </button>
                `;

                const btn = fileInfoDiv.querySelector('.remove-file-btn');
                btn.addEventListener('mouseenter', () => btn.style.color = 'var(--error)');
                btn.addEventListener('mouseleave', () => btn.style.color = 'var(--text-muted)');
                btn.addEventListener('click', () => removeFile(index));

                fileListContainer.appendChild(fileInfoDiv);
            });
        } else {
            fileListContainer.classList.add('hidden');
        }
    }

    function removeFile(index) {
        selectedFiles.splice(index, 1);
        renderFileList();
    }

    // --- FORM SUBMISSION ---

    function showAlert(msg, isSuccess) {
        if (alertMsg) alertMsg.textContent = msg;
        if (alertBox) {
            alertBox.className = `alert ${isSuccess ? 'success' : 'error'}`;
            alertBox.classList.remove('hidden');
        }
    }

    function hideAlert() {
        if (alertBox) alertBox.classList.add('hidden');
    }

    function setLoading(isLoading) {
        if (isLoading) {
            submitBtn.disabled = true;
            btnText.classList.add('hidden');
            loader.classList.remove('hidden');
        } else {
            submitBtn.disabled = false;
            btnText.classList.remove('hidden');
            loader.classList.add('hidden');
        }
    }

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            hideAlert();
            setLoading(true);

            // Update latest selections
            allCategories.forEach(cat => {
                const cb = document.getElementById(`cat_${cat.id}`);
                if (cb) cat.selected = cb.checked;
            });

            // Gather selected category names
            const selectedCategoryNames = allCategories
                .filter(c => c.selected !== false) // default is true
                .map(c => c.name);

            if (selectedCategoryNames.length === 0) {
                showAlert("Debes seleccionar al menos una categoría.", false);
                setLoading(false);
                return;
            }

            const formData = new FormData();
            formData.append('pedido_days', document.getElementById('pedidoDays').value);
            formData.append('num_rows', document.getElementById('numRows').value);
            formData.append('categories', selectedCategoryNames.join(',')); // Join as comma-separated

            selectedFiles.forEach(file => {
                formData.append('subtraction_files', file);
            });

            try {
                const response = await fetch('/api/generate', {
                    method: 'POST',
                    body: formData
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.detail || "Error al generar el reporte");
                }

                // Handle File Download
                const blob = await response.blob();

                let filename = "Pedido.xlsx";
                const disposition = response.headers.get('Content-Disposition');
                if (disposition && disposition.indexOf('filename=') !== -1) {
                    const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
                    const matches = filenameRegex.exec(disposition);
                    if (matches != null && matches[1]) {
                        filename = matches[1].replace(/['"]/g, '');
                    }
                }

                const downloadUrl = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = downloadUrl;
                a.download = filename;
                document.body.appendChild(a);
                a.click();

                window.URL.revokeObjectURL(downloadUrl);
                a.remove();

                showAlert("Reporte generado exitosamente con categorías filtradas.", true);
                selectedFiles = [];
                renderFileList();

            } catch (error) {
                console.error('Submit Error:', error);
                showAlert(error.message, false);
            } finally {
                setLoading(false);
            }
        });
    }
});
