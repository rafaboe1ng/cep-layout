document.addEventListener('DOMContentLoaded', () => {
  const sidebar = document.getElementById('sidebar');
  const hamburgerSidebarBtn = document.getElementById('hamburgerSidebarBtn');
  if (hamburgerSidebarBtn) {
    hamburgerSidebarBtn.addEventListener('click', function () {
      sidebar.classList.toggle('minimized');
    });
  }

  const dateSelect = document.getElementById('dateFilter');
  const customRange = document.getElementById('customDateRange');
  const startDateInput = document.getElementById('startDate');
  const endDateInput = document.getElementById('endDate');
  const selectedCells = new Map();

  const toDbCell = (name) => name.replace('-', '').replace('UPS0', 'UPS');

  function toggleCustomRange() {
    if (dateSelect.value === 'custom') {
      customRange.style.display = '';
    } else {
      customRange.style.display = 'none';
    }
  }

  function getDateRange() {
    const today = new Date();
    let start;
    let end;
    switch (dateSelect.value) {
      case 'today':
        start = end = today;
        break;
      case 'yesterday':
        start = end = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
        break;
      case 'last3':
        start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 2);
        end = today;
        break;
      case 'last7':
        start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6);
        end = today;
        break;
      case 'last30':
        start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 29);
        end = today;
        break;
      case 'currentWeek':
        start = new Date(today);
        start.setDate(today.getDate() - today.getDay() + 1);
        end = today;
        break;
      case 'previousWeek':
        end = new Date(today);
        end.setDate(end.getDate() - end.getDay());
        start = new Date(end);
        start.setDate(end.getDate() - 6);
        break;
      case 'currentMonth':
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        end = today;
        break;
      case 'previousMonth':
        start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        end = new Date(today.getFullYear(), today.getMonth(), 0);
        break;
      case 'currentYear':
        start = new Date(today.getFullYear(), 0, 1);
        end = today;
        break;
      case 'previousYear':
        start = new Date(today.getFullYear() - 1, 0, 1);
        end = new Date(today.getFullYear() - 1, 11, 31);
        break;
      case 'custom':
        start = startDateInput.value ? new Date(startDateInput.value) : today;
        end = endDateInput.value ? new Date(endDateInput.value) : today;
        break;
      default:
        start = end = today;
    }
    const pad = (n) => String(n).padStart(2, '0');
    const format = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    return { start: format(start), end: format(end) };
  }

  function fetchTotals() {
    if (!dateSelect) return;
    const { start, end } = getDateRange();
    const params = new URLSearchParams({ start, end });
    selectedCells.forEach((_, cell) => params.append('cell', cell));
    fetch(`/get_counts?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          const insp = document.getElementById('totalInspections');
          const def = document.getElementById('totalDefects');
          if (insp) insp.textContent = `Inspeções: ${data.total_inspections}`;
          if (def) def.textContent = `Defeitos: ${data.total_defects}`;
        }
      });
  }

  if (dateSelect && customRange) {
    toggleCustomRange();
    dateSelect.addEventListener('change', () => {
      toggleCustomRange();
      fetchTotals();
    });
  }
  if (startDateInput) startDateInput.addEventListener('change', fetchTotals);
  if (endDateInput) endDateInput.addEventListener('change', fetchTotals);

  // Atualiza gráficos conforme defeitos selecionados
  const defectSelect = document.getElementById('defectFilter');
  const selectedContainer = document.getElementById('selectedDefectsContainer');
  const sidebarList = document.getElementById('selectedDefectsSidebar');
  const clearAllBtn = document.getElementById('clearDefectsBtn');

  if (defectSelect) {
    fetch('/get_errors')
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          data.errors.forEach((err) => {
            const option = document.createElement('option');
            const text = `${err.id} - ${err.name}`;
            option.value = text;
            option.textContent = text;
            defectSelect.appendChild(option);
          });
        }
      });
  }

  if (defectSelect && selectedContainer && sidebarList && clearAllBtn) {
    const selectedDefects = new Map();

    function updateLayout() {
      const items = Array.from(selectedContainer.querySelectorAll('.selected-defect'));
      const count = items.length;

      if (count === 0) {
        selectedContainer.style.gridTemplateColumns = '';
        selectedContainer.style.gridTemplateRows = '';
        return;
      }

      let top, bottom;
      if (count % 2 === 0) {
        top = bottom = count / 2;
      } else if (count >= 3) {
        top = Math.floor(count / 2);
        bottom = count - top;
      } else {
        top = count;
        bottom = 0;
      }

      const cols = Math.max(top, bottom);
      selectedContainer.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
      selectedContainer.style.gridTemplateRows = bottom > 0 ? '1fr 1fr' : '1fr';

      const placeRow = (startIdx, n, row) => {
        if (n === 0) return;
        const baseSpan = Math.floor(cols / n) || 1;
        let leftover = cols - baseSpan * n;
        let colStart = 1;
        for (let i = 0; i < n; i++) {
          const item = items[startIdx + i];
          let span = baseSpan;
          if (leftover > 0) {
            span += 1;
            leftover -= 1;
          }
          item.style.gridRow = String(row);
          item.style.gridColumn = `${colStart} / span ${span}`;
          colStart += span;
        }
      };

      placeRow(0, top, 1);
      placeRow(top, bottom, 2);
    }

    function updateSidebarVisibility() {
      clearAllBtn.style.display = selectedDefects.size > 0 ? '' : 'none';
    }

    clearAllBtn.addEventListener('click', () => {
      selectedDefects.forEach(({ box, item }) => {
        if (box.parentNode) selectedContainer.removeChild(box);
        if (item.parentNode) sidebarList.removeChild(item);
      });
      selectedDefects.clear();
      updateLayout();
      updateSidebarVisibility();
    });

    defectSelect.addEventListener('change', () => {
      const value = defectSelect.value;
      if (value && !selectedDefects.has(value)) {
        const box = document.createElement('div');
        box.className = 'chart-item chart-small selected-defect';

        const title = document.createElement('h4');
        title.className = 'chart-title';
        title.textContent = value;
        box.appendChild(title);

        const grid = document.createElement('div');
        grid.className = 'grafico-grid';
        box.appendChild(grid);

        const closeBtn = document.createElement('button');
        closeBtn.className = 'close-btn';
        closeBtn.textContent = '✕';

        const item = document.createElement('div');
        item.className = 'sidebar-selected-defect';
        const nameSpan = document.createElement('span');
        nameSpan.textContent = value;
        item.appendChild(nameSpan);
        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-defect-btn';
        removeBtn.textContent = '✕';
        item.appendChild(removeBtn);

        const remove = (e) => {
          if (e) e.stopPropagation();
          selectedContainer.removeChild(box);
          sidebarList.removeChild(item);
          selectedDefects.delete(value);
          updateLayout();
          updateSidebarVisibility();
        };

        closeBtn.addEventListener('click', remove);
        removeBtn.addEventListener('click', remove);

        box.appendChild(closeBtn);

        selectedContainer.appendChild(box);
        sidebarList.appendChild(item);
        selectedDefects.set(value, { box, item });
        updateLayout();
        updateSidebarVisibility();
      }

      defectSelect.value = '';
    });
  }

  const cellSelect = document.getElementById('cellFilter');
  const cellSidebar = document.getElementById('selectedCellsSidebar');
  const clearCellsBtn = document.getElementById('clearCellsBtn');
  if (cellSelect && cellSidebar && clearCellsBtn) {
    function updateCellSidebarVisibility() {
      clearCellsBtn.style.display = selectedCells.size > 0 ? '' : 'none';
    }

    clearCellsBtn.addEventListener('click', () => {
      selectedCells.forEach((item) => {
        if (item.parentNode) cellSidebar.removeChild(item);
      });
      selectedCells.clear();
      updateCellSidebarVisibility();
      fetchTotals();
    });

    cellSelect.addEventListener('change', () => {
      const value = cellSelect.value;
      const dbValue = toDbCell(value);
      if (value && !selectedCells.has(dbValue)) {
        const item = document.createElement('div');
        item.className = 'sidebar-selected-defect';

        const nameSpan = document.createElement('span');
        nameSpan.textContent = value;
        item.appendChild(nameSpan);

        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-defect-btn';
        removeBtn.textContent = '✕';
        item.appendChild(removeBtn);

        const remove = (e) => {
          if (e) e.stopPropagation();
          cellSidebar.removeChild(item);
          selectedCells.delete(dbValue);
          updateCellSidebarVisibility();
          fetchTotals();
        };

        removeBtn.addEventListener('click', remove);

        cellSidebar.appendChild(item);
        selectedCells.set(dbValue, item);
        updateCellSidebarVisibility();
        fetchTotals();
      }

      cellSelect.value = '';
    });

    updateCellSidebarVisibility();
  }

  fetchTotals();
});
