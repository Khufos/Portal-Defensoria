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
                        <i data-lucide="search-x"></i>
                        <h3>Nenhum resultado encontrado</h3>
                        <p>Tente ajustar os filtros de busca</p>
                    </div>
                </td>
            </tr>
        `;
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
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
    
    // Reinitialize icons after stats update
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
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

// Helper function to sort items numerically
function sortNumerically(items) {
    return items.sort((a, b) => {
        const numA = parseInt(a.match(/(\d+)/)?.[0] || '0');
        const numB = parseInt(b.match(/(\d+)/)?.[0] || '0');
        if (numA !== numB) return numA - numB;
        return a.localeCompare(b, 'pt');
    });
}

// Populate select options with unique values from data
function populateSelectOptions() {
    // Extract unique values
    const comarcas = [...new Set(data.map(item => item.comarca))].sort((a, b) => a.localeCompare(b, 'pt'));
    const unidades = sortNumerically([...new Set(data.map(item => item.unidade))]);
    const varas = sortNumerically([...new Set(data.map(item => item.vara))]);
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
    const unidades = sortNumerically([...new Set(
        data
            .filter(item => !selectedComarca || item.comarca === selectedComarca)
            .map(i => i.unidade)
    )]);
    updateSelectOptions($('#searchUnidade'), unidades, 'Todas as Unidades');

    // Varas: filter by comarca + unidade (if selected)
    const varas = sortNumerically([...new Set(
        data
            .filter(item => {
                if (selectedComarca && item.comarca !== selectedComarca) return false;
                if (selectedUnidade && item.unidade !== selectedUnidade) return false;
                return true;
            })
            .map(i => i.vara)
    )]);
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

// expectedStructure removed — sidebar now shows only actual data varas

// Build sidebar from expectedStructure and data
function buildSidebar() {
    const $list = $('#sidebarList');
    $list.empty();

    // get all comarcas from data
    const comarcas = [...new Set(data.map(d => d.comarca))].sort((a, b) => a.localeCompare(b, 'pt'));

    comarcas.forEach(comarcaName => {
        const comarcaDiv = $('<div/>', { class: 'comarca-item' });
        const title = $('<div/>', { class: 'comarca-title' }).append(
            $('<span/>').text(comarcaName)
        );

        const unitList = $('<div/>', { class: 'unit-list' });

        // units present in data for this comarca
        const units = [...new Set(data.filter(d => d.comarca === comarcaName).map(d => d.unidade))];
        
        // Sort units numerically by extracting the number at the beginning
        units.sort((a, b) => {
            const numA = parseInt(a.match(/(\d+)/)?.[0] || '0');
            const numB = parseInt(b.match(/(\d+)/)?.[0] || '0');
            if (numA !== numB) return numA - numB;
            return a.localeCompare(b, 'pt');
        });

        units.forEach(unitName => {
            const unitItem = $('<div/>', { class: 'unit-item' }).text(unitName);
            const varaList = $('<div/>', { class: 'vara-list' });

            // collect varas present in data for this comarca/unit
            const actualVaras = [...new Set(data.filter(d => d.comarca === comarcaName && d.unidade === unitName).map(d => d.vara))];
            const allVaras = [...new Set(actualVaras)];

            // Sort varas numerically by extracting the number at the beginning
            allVaras.sort((a, b) => {
                const numA = parseInt(a.match(/(\d+)/)?.[0] || '0');
                const numB = parseInt(b.match(/(\d+)/)?.[0] || '0');
                if (numA !== numB) return numA - numB;
                return a.localeCompare(b, 'pt');
            });

            allVaras.forEach(vara => {
                const present = actualVaras.some(av => normalizeText(av) === normalizeText(vara) || normalizeText(av).includes(normalizeText(vara)));
                const vItem = $('<div/>', { class: 'vara-item ' + (present ? 'present' : 'missing') }).append(
                    $('<span/>').text(vara),
                    $('<span/>', { class: 'small' }).text(present ? 'cadastrado' : 'faltando')
                );
                varaList.append(vItem);
            });

            // click unit to toggle
            // add badge with count of varas
            const badge = $('<span/>', { class: 'unit-badge' }).text(actualVaras.length);
            unitItem.append(badge);

            unitItem.on('click', function() {
                varaList.slideToggle(120);
                unitItem.toggleClass('open');
            });

            unitList.append(unitItem, varaList);
        });

        comarcaDiv.append(title, unitList);
        $list.append(comarcaDiv);
    });

    // compare feature removed — no button handler
}

// compare function removed per request

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
    // build sidebar after initial population
    buildSidebar();
    
    // Initialize Lucide icons
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
    
    // Helper function for smart matching (considers word boundaries for numbers)
    function smartMatch(text, searchTerm) {
        const normalizedText = normalizeText(text);
        const normalizedSearch = normalizeText(searchTerm);
        
        // If search term starts with a number followed by "o" or space, match exact ordinal
        const ordinalMatch = normalizedSearch.match(/^(\d+)\s*(o)?\s*/);
        if (ordinalMatch) {
            const searchNum = ordinalMatch[1];
            // Extract the number at the beginning of the text
            const textMatch = normalizedText.match(/^(\d+)\s*(o)?\s*/);
            if (textMatch) {
                const textNum = textMatch[1];
                // Only match if the numbers are exactly the same
                if (searchNum === textNum) {
                    // Check if the rest of the search term matches
                    const restOfSearch = normalizedSearch.substring(ordinalMatch[0].length);
                    if (restOfSearch === '' || normalizedText.includes(restOfSearch)) {
                        return true;
                    }
                }
                return false;
            }
        }
        
        // Default: simple includes for non-ordinal searches
        return normalizedText.includes(normalizedSearch);
    }
    
    // Sidebar search functionality
    $('#sidebarSearch').on('input', function() {
        const searchTerm = $(this).val().trim();
        
        if (searchTerm === '') {
            // Show all items
            $('.comarca-item').show();
            $('.unit-item').show();
            $('.vara-list').hide();
            $('.unit-item').removeClass('open');
        } else {
            // Filter items
            $('.comarca-item').each(function() {
                const $comarcaItem = $(this);
                const comarcaName = $comarcaItem.find('.comarca-title span').text();
                let hasMatch = false;
                
                // Check if comarca matches
                if (smartMatch(comarcaName, searchTerm)) {
                    hasMatch = true;
                    $comarcaItem.find('.unit-item').show();
                } else {
                    // Check units
                    $comarcaItem.find('.unit-item').each(function() {
                        const $unitItem = $(this);
                        // Get only the text content, excluding the badge
                        const unitText = $unitItem.contents().filter(function() {
                            return this.nodeType === 3; // Text nodes only
                        }).text();
                        
                        if (smartMatch(unitText, searchTerm)) {
                            $unitItem.show();
                            hasMatch = true;
                        } else {
                            // Check varas
                            const $varaList = $unitItem.next('.vara-list');
                            let hasVaraMatch = false;
                            
                            $varaList.find('.vara-item').each(function() {
                                const varaText = $(this).text();
                                if (smartMatch(varaText, searchTerm)) {
                                    hasVaraMatch = true;
                                }
                            });
                            
                            if (hasVaraMatch) {
                                $unitItem.show();
                                $varaList.show();
                                $unitItem.addClass('open');
                                hasMatch = true;
                            } else {
                                $unitItem.hide();
                            }
                        }
                    });
                }
                
                if (hasMatch) {
                    $comarcaItem.show();
                } else {
                    $comarcaItem.hide();
                }
            });
        }
    });
});
