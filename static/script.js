document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('subtractionFile');
    const dropArea = document.getElementById('dropArea');
    const fileInfo = document.getElementById('fileInfo');
    const fileName = document.getElementById('fileName');
    const removeFileBtn = document.getElementById('removeFile');

    const form = document.getElementById('generateForm');
    const submitBtn = document.getElementById('submitBtn');
    const btnText = submitBtn.querySelector('.btn-text');
    const loader = submitBtn.querySelector('.loader');

    const alertBox = document.getElementById('alertBox');
    const alertMsg = document.getElementById('alertMsg');

    // Drag and Drop Logic
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        dropArea.addEventListener(eventName, () => dropArea.classList.add('is-active'), false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, () => dropArea.classList.remove('is-active'), false);
    });

    dropArea.addEventListener('drop', handleDrop, false);

    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        if (files.length) {
            fileInput.files = files;
            updateFileDisplay();
        }
    }

    fileInput.addEventListener('change', updateFileDisplay);

    function updateFileDisplay() {
        if (fileInput.files.length > 0) {
            const file = fileInput.files[0];
            if (!file.name.endsWith('.xlsx')) {
                showAlert("Por favor, selecciona un archivo Excel (.xlsx)", false);
                fileInput.value = '';
                return;
            }
            fileName.textContent = file.name;
            dropArea.style.display = 'none';
            fileInfo.classList.remove('hidden');
        } else {
            dropArea.style.display = 'flex';
            fileInfo.classList.add('hidden');
        }
    }

    removeFileBtn.addEventListener('click', () => {
        fileInput.value = '';
        updateFileDisplay();
    });

    function showAlert(msg, isSuccess) {
        alertMsg.textContent = msg;
        alertBox.className = `alert ${isSuccess ? 'success' : 'error'}`;
        alertBox.classList.remove('hidden');
    }

    function hideAlert() {
        alertBox.classList.add('hidden');
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

    // Form Submission
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        hideAlert();
        setLoading(true);

        const formData = new FormData(form);

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

            // Extract filename from Content-Disposition header if possible
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

            // Cleanup
            window.URL.revokeObjectURL(downloadUrl);
            a.remove();

            showAlert("Reporte generado exitosamente.", true);
            form.reset();
            updateFileDisplay();

        } catch (error) {
            console.error('Submit Error:', error);
            showAlert(error.message, false);
        } finally {
            setLoading(false);
        }
    });

});
