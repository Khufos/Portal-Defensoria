function normalizeText(str) {
    if (str == null) return '';
    return String(str)
        .toLowerCase()
        .normalize('NFD')                  // separa diacríticos
        .replace(/[\u0300-\u036f]/g, '')   // remove diacríticos
        .replace(/[ºª°]/g, '')            // remove ordinais (3º -> 3)
        .replace(/['"“”‘’`·•–—–−]/g, '')   // remove aspas e traços especiais
        .replace(/[^a-z0-9\s]/g, ' ')     // substitui pontuação por espaço
        .replace(/\s+/g, ' ')             // colapsa espaços
        .trim();
}

function renderTable(items) {
    const tbody = document.getElementById('tableBody');
    
    if (items.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5">
                    <div class="empty-state">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                        </svg>
                        <h3>Nenhum resultado encontrado</h3>
                        <p>Tente ajustar os filtros de busca</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = items.map(item => `
        <tr>
            <td><strong>${item.comarca}</strong></td>
            <td>${item.unidadeId}</td>
            <td>${item.unidade}</td>
            <td>${item.vara}</td>
            <td>${item.codigo ? `<span class="badge">${item.codigo}</span>` : '-'}</td>
        </tr>
    `).join('');
}

function updateStats(items) {
    document.getElementById('totalResults').textContent = items.length;
    document.getElementById('totalComarcas').textContent = new Set(items.map(i => i.comarca)).size;
    document.getElementById('totalUnidades').textContent = new Set(items.map(i => i.unidadeId)).size;
}

function filterData() {
    const comarca = $('#searchComarca').val() || '';
    const unidade = $('#searchUnidade').val() || '';
    const vara = $('#searchVara').val() || '';
    const codigo = $('#searchCodigo').val() || '';

    const nComarca = normalizeText(comarca);
    const nUnidade = normalizeText(unidade);
    const nVara = normalizeText(vara);
    const nCodigo = normalizeText(codigo);

    const filtered = data.filter(item => {
        const ni = {
            comarca: normalizeText(item.comarca),
            unidade: normalizeText(item.unidade),
            vara: normalizeText(item.vara),
            codigo: normalizeText(item.codigo)
        };

        return (
            (nComarca === '' || ni.comarca.includes(nComarca)) &&
            (nUnidade === '' || ni.unidade.includes(nUnidade)) &&
            (nVara === '' || ni.vara.includes(nVara)) &&
            (nCodigo === '' || ni.codigo.includes(nCodigo))
        );
    });

    renderTable(filtered);
    updateStats(filtered);
}

function clearFilters() {
    // reset values
    $('#searchComarca').val('').trigger('change');
    $('#searchUnidade').val('').trigger('change');
    $('#searchVara').val('').trigger('change');
    $('#searchCodigo').val('').trigger('change');

    // repopula opções completas e atualiza dependentes
    populateSelectOptions();
    refreshDependentSelects();
    filterData();
}

// Populate select options with unique values from data
function populateSelectOptions() {
    // Extract unique values
    const comarcas = [...new Set(data.map(item => item.comarca))].sort();
    const unidades = [...new Set(data.map(item => item.unidade))].sort();
    const varas = [...new Set(data.map(item => item.vara))].sort();
    const codigos = [...new Set(data.map(item => item.codigo).filter(c => c !== ''))].sort((a, b) => a - b);

    // Populate Comarca
    const comarcaSelect = $('#searchComarca');
    comarcaSelect.empty();
    comarcaSelect.append(new Option('Todas as Comarcas', ''));
    comarcas.forEach(comarca => {
        comarcaSelect.append(new Option(comarca, comarca));
    });

    // Populate Unidade (full list)
    const unidadeSelect = $('#searchUnidade');
    unidadeSelect.empty();
    unidadeSelect.append(new Option('Todas as Unidades', ''));
    unidades.forEach(unidade => {
        unidadeSelect.append(new Option(unidade, unidade));
    });

    // Populate Vara (full list)
    const varaSelect = $('#searchVara');
    varaSelect.empty();
    varaSelect.append(new Option('Todas as Varas', ''));
    varas.forEach(vara => {
        varaSelect.append(new Option(vara, vara));
    });

    // Populate Codigo (full list)
    const codigoSelect = $('#searchCodigo');
    codigoSelect.empty();
    codigoSelect.append(new Option('Todos os Códigos PJE', ''));
    codigos.forEach(codigo => {
        codigoSelect.append(new Option(codigo, codigo));
    });
}

// update options helper: keeps selection if still valid
function updateSelectOptions($select, options, placeholderText) {
    const current = $select.val() || '';
    $select.empty();
    $select.append(new Option(placeholderText, ''));
    options.forEach(opt => $select.append(new Option(opt, opt)));
    // restore if still valid
    if (current && options.indexOf(current) > -1) {
        $select.val(current);
    } else {
        $select.val('');
    }
    $select.trigger('change.select2'); // refresh Select2 UI
}

// Refresh dependent selects based on current selections
function refreshDependentSelects() {
    const selectedComarca = $('#searchComarca').val() || '';
    const selectedUnidade = $('#searchUnidade').val() || '';

    // Unidades: if comarca selected, show only unidades daquela comarca
    const unidades = [...new Set(
        data
            .filter(item => !selectedComarca || item.comarca === selectedComarca)
            .map(i => i.unidade)
    )].sort();
    updateSelectOptions($('#searchUnidade'), unidades, 'Todas as Unidades');

    // Varas: filter by comarca + unidade (if selected)
    const varas = [...new Set(
        data
            .filter(item => {
                if (selectedComarca && item.comarca !== selectedComarca) return false;
                if (selectedUnidade && item.unidade !== selectedUnidade) return false;
                return true;
            })
            .map(i => i.vara)
    )].sort();
    updateSelectOptions($('#searchVara'), varas, 'Todas as Varas');

    // Codigos: same logic as varas
    const codigos = [...new Set(
        data
            .filter(item => {
                if (selectedComarca && item.comarca !== selectedComarca) return false;
                if (selectedUnidade && item.unidade !== selectedUnidade) return false;
                return true;
            })
            .map(i => i.codigo)
            .filter(c => c !== '')
    )].sort((a, b) => a - b);
    updateSelectOptions($('#searchCodigo'), codigos, 'Todos os Códigos PJE');
}

// Custom matcher for Select2 using normalization
function select2Matcher(params, data) {
    if (!params.term || params.term.trim() === '') {
        return data;
    }
    const term = normalizeText(params.term);
    const text = normalizeText(data.text || '');
    if (text.indexOf(term) > -1) {
        return data;
    }
    return null;
}

// Initialize Select2 and set up event handlers
$(document).ready(function() {
    // Populate options first
    populateSelectOptions();

    // Initialize Select2 with Portuguese language, search and matcher
    $('#searchComarca').select2({
        placeholder: 'Buscar por Comarca...',
        allowClear: true,
        width: '100%',
        matcher: select2Matcher,
        language: {
            noResults: function() { return "Nenhum resultado encontrado"; },
            searching: function() { return "Buscando..."; }
        }
    });

    $('#searchUnidade').select2({
        placeholder: 'Buscar por Unidade...',
        allowClear: true,
        width: '100%',
        matcher: select2Matcher,
        language: {
            noResults: function() { return "Nenhum resultado encontrado"; },
            searching: function() { return "Buscando..."; }
        }
    });

    $('#searchVara').select2({
        placeholder: 'Buscar por Vara...',
        allowClear: true,
        width: '100%',
        matcher: select2Matcher,
        language: {
            noResults: function() { return "Nenhum resultado encontrado"; },
            searching: function() { return "Buscando..."; }
        }
    });

    $('#searchCodigo').select2({
        placeholder: 'Buscar por Código PJE...',
        allowClear: true,
        width: '100%',
        matcher: select2Matcher,
        language: {
            noResults: function() { return "Nenhum resultado encontrado"; },
            searching: function() { return "Buscando..."; }
        }
    });

    // Attach change event listeners (cascade + filter)
    $('#searchComarca').on('change', function() {
        // update unidades/varas/codigos based on selected comarca
        refreshDependentSelects();
        filterData();
    });

    $('#searchUnidade').on('change', function() {
        // update varas/codigos based on selected unidade (and comarca)
        refreshDependentSelects();
        filterData();
    });

    $('#searchVara').on('change', filterData);
    $('#searchCodigo').on('change', filterData);

    // Initial dependent population and render
    refreshDependentSelects();
    renderTable(data);
    updateStats(data);
});
