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

    const btnDescargar = document.getElementById('btnDescargar');
    const btnDescargarLoader = btnDescargar.querySelector('.loader');

    // Config Modal Elements
    const configModal = document.getElementById('configModal');
    const btnOpenConfig = document.getElementById('btnOpenConfig');
    const btnCloseConfig = document.getElementById('btnCloseConfig');
    const btnSaveConfig = document.getElementById('btnSaveConfig');
    const cfgPedidoDays = document.getElementById('cfgPedidoDays');
    const cfgNumRows = document.getElementById('cfgNumRows');
    const cfgUmbral = document.getElementById('cfgUmbral');

    // Main UI Inputs
    const mainPedidoDays = document.getElementById('pedidoDays');
    const mainNumRows = document.getElementById('numRows');
    const mainUmbral = document.getElementById('umbralRotacion');

    // Global state for Report
    let currentReportB64 = null;
    let currentReportFilename = null;
    let currentFormData = null; // Store last form data to re-use if force_included is needed

    // --- CONFIGURATION LOGIC ---
    function loadConfig() {
        // Populate cfgPedidoDays dynamically from main list
        cfgPedidoDays.innerHTML = mainPedidoDays.innerHTML;

        const savedDays = localStorage.getItem('cfg_pedidoDays');
        const savedRows = localStorage.getItem('cfg_numRows');
        const savedUmbral = localStorage.getItem('cfg_umbral');

        if (savedDays) { mainPedidoDays.value = savedDays; cfgPedidoDays.value = savedDays; }
        if (savedRows) { mainNumRows.value = savedRows; cfgNumRows.value = savedRows; }
        if (savedUmbral) { mainUmbral.value = savedUmbral; cfgUmbral.value = savedUmbral; }
    }

    loadConfig();

    btnOpenConfig.addEventListener('click', () => {
        cfgPedidoDays.value = mainPedidoDays.value;
        cfgNumRows.value = mainNumRows.value;
        cfgUmbral.value = mainUmbral.value;
        configModal.classList.add('active');
    });

    btnCloseConfig.addEventListener('click', () => configModal.classList.remove('active'));
    
    // Close on overlay click
    configModal.addEventListener('click', (e) => {
        if (e.target === configModal) configModal.classList.remove('active');
    });

    btnSaveConfig.addEventListener('click', () => {
        localStorage.setItem('cfg_pedidoDays', cfgPedidoDays.value);
        localStorage.setItem('cfg_numRows', cfgNumRows.value);
        localStorage.setItem('cfg_umbral', cfgUmbral.value);

        mainPedidoDays.value = cfgPedidoDays.value;
        mainNumRows.value = cfgNumRows.value;
        mainUmbral.value = cfgUmbral.value;

        configModal.classList.remove('active');
        showAlert("Configuración guardada por defecto.", true);
    });

    // --- CHECKBOX LOGIC FOR DISCARDED --
    const selectAllDiscarded = document.getElementById('selectAllDiscarded');
    if (selectAllDiscarded) {
        selectAllDiscarded.addEventListener('change', (e) => {
            const checks = document.querySelectorAll('.discard-chk');
            checks.forEach(chk => chk.checked = e.target.checked);
        });
    }

    // Category Elements
    const categoriesList = document.getElementById('categoriesList');
    const categoryCount = document.getElementById('categoryCount');
    const categorySearch = document.getElementById('categorySearch');
    const btnSelectAll = document.getElementById('btnSelectAll');
    const btnSelectNone = document.getElementById('btnSelectNone');
    const btnInvertSelection = document.getElementById('btnInvertSelection');

    let selectedFiles = []; // Array to store files

    // categoryMap stores the state of each category by ID
    let categoryMap = {};
    let categoryTree = [];

    // --- CATEGORY LOGIC ---

    async function fetchCategories() {
        try {
            const response = await fetch('/api/categories');
            if (!response.ok) throw new Error("Failed to fetch categories");
            const data = await response.json();

            const rawCategories = data.categories || [];

            // Initialize map
            categoryMap = {};
            rawCategories.forEach(cat => {
                categoryMap[cat.id] = {
                    id: cat.id,
                    name: cat.name,
                    parentId: cat.parentId,
                    selected: true,
                    indeterminate: false,
                    children: [],
                    visible: true // for search filtering
                };
            });

            // Build Tree
            categoryTree = [];
            Object.values(categoryMap).forEach(cat => {
                // Determine if this is a root node. To be safe, if parent is "0" or parent doesn't exist in map.
                if (cat.parentId === "0" || !categoryMap[cat.parentId]) {
                    categoryTree.push(cat);
                } else {
                    categoryMap[cat.parentId].children.push(cat);
                }
            });

            renderCategories();
        } catch (error) {
            console.error(error);
            if (categoriesList) {
                categoriesList.innerHTML = `<li class="error-text" style="color:var(--error); padding:1rem;">Error cargando categorías. Revisa la conexión a BD.</li>`;
            }
        }
    }

    function renderCategories() {
        if (!categoriesList) return;
        categoriesList.innerHTML = '';

        let visibleCount = 0;

        function buildNodeDOM(node) {
            if (!node.visible) return null;
            visibleCount++;

            const li = document.createElement('li');
            li.className = 'category-item';

            const hasChildren = node.children.some(c => c.visible);

            const row = document.createElement('div');
            row.className = 'category-row';

            // Toggle Button for children
            if (hasChildren) {
                const toggleBtn = document.createElement('button');
                toggleBtn.type = 'button';
                toggleBtn.className = 'toggle-btn';
                toggleBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>`;
                toggleBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    toggleBtn.classList.toggle('open');
                    const childUl = li.querySelector(`ul`);
                    if (childUl) childUl.classList.toggle('open');
                });
                row.appendChild(toggleBtn);
            } else {
                // Spacer if no children to align checkboxes
                const spacer = document.createElement('div');
                spacer.style.width = '20px';
                spacer.style.marginRight = '0.25rem';
                spacer.style.flexShrink = '0';
                row.appendChild(spacer);
            }

            // Checkbox
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `cat_${node.id}`;
            checkbox.value = node.name;
            checkbox.checked = node.selected;
            checkbox.indeterminate = node.indeterminate;

            checkbox.addEventListener('change', (e) => {
                handleCheckboxChange(node.id, e.target.checked);
            });
            row.appendChild(checkbox);

            // Label
            const label = document.createElement('label');
            label.htmlFor = `cat_${node.id}`;
            label.title = node.name;
            label.textContent = node.name;
            if (hasChildren) {
                label.style.fontWeight = '600';
            }
            row.appendChild(label);
            li.appendChild(row);

            // Children UL
            if (hasChildren) {
                const ul = document.createElement('ul');
                ul.className = 'nested-categories';
                node.children.forEach(child => {
                    const childDOM = buildNodeDOM(child);
                    if (childDOM) ul.appendChild(childDOM);
                });
                li.appendChild(ul);
            }

            return li;
        }

        categoryTree.forEach(rootNode => {
            const nodeDOM = buildNodeDOM(rootNode);
            if (nodeDOM) categoriesList.appendChild(nodeDOM);
        });

        if (visibleCount === 0) {
            categoriesList.innerHTML = `<li style="padding:1rem; color:var(--text-muted); font-size:0.875rem;">No se encontraron categorías.</li>`;
        }

        updateCategoryCount();
    }

    function handleCheckboxChange(id, isChecked) {
        const node = categoryMap[id];
        if (!node) return;

        // 1. Update this node
        node.selected = isChecked;
        node.indeterminate = false;

        // 2. Cascade down to children
        function updateChildren(n, checkState) {
            n.children.forEach(child => {
                child.selected = checkState;
                child.indeterminate = false;

                // Update DOM if rendered
                const cb = document.getElementById(`cat_${child.id}`);
                if (cb) {
                    cb.checked = checkState;
                    cb.indeterminate = false;
                }

                updateChildren(child, checkState);
            });
        }
        updateChildren(node, isChecked);

        // 3. Cascade up to parents
        updateParentState(node.parentId);

        updateCategoryCount();
    }

    function updateParentState(parentId) {
        if (!parentId || parentId === "0") return; // reached root

        const parent = categoryMap[parentId];
        if (!parent) return;

        let allSelected = true;
        let noneSelected = true;
        let hasIndeterminate = false;

        parent.children.forEach(child => {
            if (child.selected) {
                noneSelected = false;
            } else {
                allSelected = false;
            }
            if (child.indeterminate) {
                hasIndeterminate = true;
            }
        });

        if (allSelected && !hasIndeterminate) {
            parent.selected = true;
            parent.indeterminate = false;
        } else if (noneSelected && !hasIndeterminate) {
            parent.selected = false;
            parent.indeterminate = false;
        } else {
            // Mixed logic
            parent.selected = false;
            parent.indeterminate = true;
        }

        // Update DOM
        const cb = document.getElementById(`cat_${parent.id}`);
        if (cb) {
            cb.checked = parent.selected;
            cb.indeterminate = parent.indeterminate;
        }

        // Recurse up
        updateParentState(parent.parentId);
    }

    function applySearch(filterText) {
        const lowerFilter = filterText.toLowerCase();

        // Pass 1: Tag visibility based on name match
        Object.values(categoryMap).forEach(cat => {
            cat.visible = cat.name.toLowerCase().includes(lowerFilter) || cat.id.toLowerCase().includes(lowerFilter);
        });

        // Pass 2: Ensure parents are visible if any child is visible
        function ensureParentVisibility(node) {
            let childIsVisible = false;
            node.children.forEach(child => {
                if (ensureParentVisibility(child)) {
                    childIsVisible = true;
                }
            });
            if (childIsVisible) {
                node.visible = true;
            }
            return node.visible;
        }

        categoryTree.forEach(ensureParentVisibility);
        renderCategories();

        // If searching, auto-expand folders to show results
        if (filterText.length > 0) {
            document.querySelectorAll('.toggle-btn').forEach(btn => btn.classList.add('open'));
            document.querySelectorAll('.nested-categories').forEach(ul => ul.classList.add('open'));
        }
    }

    function updateCategoryCount() {
        if (!categoryCount) return;
        const total = Object.keys(categoryMap).length;
        // Count fully selected nodes. Do we count indeterminate? No.
        const checkedCount = Object.values(categoryMap).filter(c => c.selected).length;
        categoryCount.textContent = `${checkedCount} / ${total}`;
    }

    // --- DOM EVENTS ---

    if (categorySearch) {
        categorySearch.addEventListener('input', (e) => {
            applySearch(e.target.value);
        });
    }

    if (btnSelectAll) {
        btnSelectAll.addEventListener('click', () => {
            categoryTree.forEach(root => {
                handleCheckboxChange(root.id, true);
                const cb = document.getElementById(`cat_${root.id}`);
                if (cb) cb.checked = true;
            });
        });
    }

    if (btnSelectNone) {
        btnSelectNone.addEventListener('click', () => {
            categoryTree.forEach(root => {
                handleCheckboxChange(root.id, false);
                const cb = document.getElementById(`cat_${root.id}`);
                if (cb) cb.checked = false;
            });
        });
    }

    if (btnInvertSelection) {
        btnInvertSelection.addEventListener('click', () => {
            // Because inversion is tricky on trees (do you invert parents or children?), 
            // the simplest approach for a tree is to invert ONLY root nodes and let it cascade,
            // or invert leaves and cascade up. Let's invert all independently, then re-sync.
            Object.values(categoryMap).forEach(c => {
                c.selected = !c.selected;
                c.indeterminate = false;
            });
            // Re-sync bottom up
            function syncUp(node) {
                node.children.forEach(syncUp);
                if (node.children.length > 0) {
                    let allSelected = true;
                    let noneSelected = true;
                    node.children.forEach(c => {
                        if (c.selected) noneSelected = false;
                        else allSelected = false;
                    });
                    if (allSelected) { node.selected = true; node.indeterminate = false; }
                    else if (noneSelected) { node.selected = false; node.indeterminate = false; }
                    else { node.selected = false; node.indeterminate = true; }
                }
            }
            categoryTree.forEach(syncUp);
            renderCategories();
        });
    }

    // Initialize Categories
    fetchCategories();

    // --- DRAG AND DROP FILE LOGIC ---
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        if (dropArea) dropArea.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) { e.preventDefault(); e.stopPropagation(); }

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
            fileInput.value = ''; // reset so same files can trigger change again
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
            btnDescargar.classList.add('hidden');
            currentReportB64 = null;
            currentReportFilename = null;

            const formData = new FormData();
            formData.append('pedido_days', document.getElementById('pedidoDays').value);
            formData.append('num_rows', document.getElementById('numRows').value);
            formData.append('umbral', document.getElementById('umbralRotacion').value);

            // Append all selected files to the form data
            selectedFiles.forEach(file => {
                formData.append('subtraction_files', file);
            });

            // Gather selected category names
            // IMPORTANT: If we send parents, the DB will filter by the parent name which might not exist in the items directly if products are bound to leaf nodes.
            // Wait, the python filter matches the `Instancia` string exactly.
            // Usually, products are bound to specific categories. Let's send ALL checked items (parents and children) to cover all bases just in case products are mapped to intermediate nodes.
            const selectedCategoryNames = Object.values(categoryMap)
                .filter(c => c.selected)
                .map(c => c.name);

            if (selectedCategoryNames.length === 0) {
                showAlert("Debes seleccionar al menos una categoría.", false);
                setLoading(false);
                return;
            }

            formData.append('categories', selectedCategoryNames.join(','));

            try {
                const response = await fetch('/api/generate', {
                    method: 'POST',
                    body: formData
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.detail || "Error al generar el reporte");
                }

                const responseData = await response.json();
                
                currentReportB64 = responseData.file_b64;
                currentReportFilename = responseData.filename || "Pedido.xlsx";
                currentFormData = formData; // Remember what we queried

                // Handle visual report of discarded items
                const visualSection = document.getElementById('visualReportSection');
                const tbody = document.getElementById('discardedTableBody');
                
                const discarded_list = responseData.discarded_list || [];
                
                if (discarded_list && discarded_list.length > 0) {
                    tbody.innerHTML = '';
                    discarded_list.forEach(item => {
                        const tr = document.createElement('tr');
                        tr.innerHTML = `
                            <td style="text-align:center;"><input type="checkbox" class="discard-chk" value="${item.Codigo}"></td>
                            <td>${item.Codigo}</td>
                            <td>${item.Descripcion}</td>
                            <td>${item.RotacionMensual}</td>
                            <td>${item.Existencia}</td>
                        `;
                        tbody.appendChild(tr);
                    });
                    visualSection.classList.remove('hidden');
                } else {
                    visualSection.classList.add('hidden');
                }

                if (selectAllDiscarded) selectAllDiscarded.checked = false;

                showAlert(`Reporte generado exitosamente. Listo para descargar.`, true);
                btnDescargar.classList.remove('hidden');

                // Don't clear selected files here, they might want to re-run
            } catch (error) {
                console.error('Submit Error:', error);
                showAlert(error.message, false);
            } finally {
                setLoading(false);
            }
        });
    }

    if (btnDescargar) {
        btnDescargar.addEventListener('click', async () => {
            const checkedBoxes = document.querySelectorAll('.discard-chk:checked');
            const forceCodes = Array.from(checkedBoxes).map(chk => chk.value);

            if (forceCodes.length > 0) {
                // Must make an overriding API call
                try {
                    btnDescargar.disabled = true;
                    btnDescargarLoader.classList.remove('hidden');
                    btnDescargar.querySelector('.btn-text').classList.add('hidden');

                    const newFormData = new FormData();
                    // Copy existing data
                    for (let pair of currentFormData.entries()) {
                        newFormData.append(pair[0], pair[1]);
                    }
                    newFormData.append('force_include_codes', forceCodes.join(','));

                    const response = await fetch('/api/generate', {
                        method: 'POST',
                        body: newFormData
                    });

                    if (!response.ok) throw new Error("Error al incluir los items solicitados");
                    const responseData = await response.json();
                    
                    await downloadBase64Exc(responseData.file_b64, responseData.filename || "Pedido.xlsx");
                    
                    // Uncheck them after successful override
                    checkedBoxes.forEach(chk => chk.checked = false);
                    if (selectAllDiscarded) selectAllDiscarded.checked = false;
                    showAlert(`Se descargó el excel forzando inclusión de ${forceCodes.length} producto(s).`, true);
                } catch (err) {
                    console.error(err);
                    showAlert(err.message, false);
                } finally {
                    btnDescargar.disabled = false;
                    btnDescargarLoader.classList.add('hidden');
                    btnDescargar.querySelector('.btn-text').classList.remove('hidden');
                }
            } else {
                // No overrides, just download cached excel
                if (currentReportB64) {
                    await downloadBase64Exc(currentReportB64, currentReportFilename);
                }
            }
        });
    }

    async function downloadBase64Exc(b64, filename) {
        const blobResponse = await fetch(`data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${b64}`);
        const blob = await blobResponse.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = downloadUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(downloadUrl);
        a.remove();
    }
});
