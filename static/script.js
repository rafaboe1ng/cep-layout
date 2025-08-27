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
  const lastUpdateEl = document.getElementById('lastUpdate');
  const updateNowBtn = document.getElementById('updateNowBtn');

  const toDbCell = (name) => name.replace('-', '').replace('UPS0', 'UPS');

  const formatDateTime = (str) => {
    const d = new Date(str);
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  };

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
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        start = end = yesterday;
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
        {
          const day = today.getDay();
          const diffToMonday = day === 0 ? -6 : 1 - day;
          start = new Date(today.getFullYear(), today.getMonth(), today.getDate() + diffToMonday);
          end = today;
        }
        break;
      case 'previousWeek':
        {
          const day = today.getDay();
          const lastSunday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - day);
          end = new Date(lastSunday.getFullYear(), lastSunday.getMonth(), lastSunday.getDate());
          start = new Date(end.getFullYear(), end.getMonth(), end.getDate() - 6);
        }
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
    if (!dateSelect) return Promise.resolve();
    const { start, end } = getDateRange();
    const params = new URLSearchParams({ start, end });
    selectedCells.forEach((_, cell) => params.append('cell', cell));
    return fetch(`/get_counts?${params.toString()}`)
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
      refreshAndUpdate();
    });
  }
  if (startDateInput) startDateInput.addEventListener('change', refreshAndUpdate);
  if (endDateInput) endDateInput.addEventListener('change', refreshAndUpdate);

  // Atualiza gráficos conforme defeitos selecionados
  const defectSelect = document.getElementById('defectFilter');
  const selectedContainer = document.getElementById('selectedDefectsContainer');
  const sidebarList = document.getElementById('selectedDefectsSidebar');
  const clearAllBtn = document.getElementById('clearDefectsBtn');
  const selectedDefects = new Map();
  const defectOrderSwitch = document.getElementById('defectOrderSwitch');
  const defectQuantityInput = document.getElementById('defectQuantity');
  const defectQuantityOk = document.getElementById('defectQuantityOk');
  const topDefectTitles = [
    document.getElementById('topDefect1'),
    document.getElementById('topDefect2'),
    document.getElementById('topDefect3'),
  ];
  let showingTop = false;

  function updateLayout() {
    const items = Array.from(selectedContainer.querySelectorAll('.chart-item'));
    const count = items.length;

    // Reset previous manual positioning
    items.forEach((item) => {
      item.style.gridRow = '';
      item.style.gridColumn = '';
    });

    // Toggle helper class for odd layouts
    selectedContainer.classList.toggle('odd-count', count % 2 === 1 && count > 1);
  }

  function buildParams(extra = {}) {
    const { start, end } = getDateRange();
    const paramsObj = { start, end, ...extra };
    if (
      dateSelect &&
      (dateSelect.value === 'currentYear' || dateSelect.value === 'previousYear')
    ) {
      paramsObj.bucket = 'biweekly';
    }
    const params = new URLSearchParams(paramsObj);
    selectedCells.forEach((_, cell) => params.append('cell', cell));
    return params;
  }

  function renderUChart(container, errorId) {
    if (!container) return Promise.resolve();
    const params = buildParams(errorId ? { error: errorId } : {});
    return fetch(`/get_u_chart?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        if (!data.success) return;
        const labels = data.data.map((d) => formatDateTime(d.date));
        const uData = data.data.map((d) => d.u);
        const uclData = data.data.map((d) => d.ucl);
        const lclData = data.data.map((d) => d.lcl);
        const step = errorId ? 0.25 : 0.5;
        const maxValue = Math.max(...uData, ...uclData, step);
        const yMax = Number((Math.ceil(maxValue / step) * step).toFixed(2));
        if (container._chart) {
          container._chart.destroy();
        }
        container.innerHTML = '';
        const canvas = document.createElement('canvas');
        canvas.style.backgroundColor = '#fff';
        container.appendChild(canvas);
        container._chart = new Chart(canvas.getContext('2d'), {
          type: 'line',
          data: {
            labels,
            datasets: [
              { label: 'u', data: uData, borderColor: 'blue', fill: false },
              {
                label: 'UCL',
                data: uclData,
                borderColor: 'red',
                borderDash: [5, 5],
                fill: false,
              },
              {
                label: 'LCL',
                data: lclData,
                borderColor: 'green',
                borderDash: [5, 5],
                fill: false,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              x: {
                offset: true,
              },
              y: {
                min: 0,
                max: yMax,
                grid: {
                  drawBorder: false,
                },
                ticks: {
                  stepSize: step,
                  precision: 2,
                  callback: (value) => Number(value).toFixed(2),
                },
              },
            },
          },
        });
      });
  }

  function loadTop3() {
    const params = buildParams({ order: 'desc', limit: 3 });
    return fetch(`/get_top_defects?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          const grids = document.querySelectorAll('.top3-row .grafico-grid');
          for (let i = 0; i < 3; i++) {
            const title = topDefectTitles[i];
            const grid = grids[i];
            const defect = data.defects[i];
            if (title) {
              title.textContent = defect
                ? `${defect.id} - ${defect.name} (${defect.total})`
                : '- (0)';
            }
            if (grid) {
              if (grid._chart) {
                grid._chart.destroy();
              }
              grid.innerHTML = '';
              grid.dataset.errorId = defect ? defect.id : '';
            }
          }
        }
      });
  }

  function loadTopDefects() {
    const order = defectOrderSwitch && defectOrderSwitch.checked ? 'asc' : 'desc';
    const limit = defectQuantityInput ? parseInt(defectQuantityInput.value) || 6 : 6;
    const params = buildParams({ order, limit });
    return fetch(`/get_top_defects?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          selectedContainer.querySelectorAll('.grafico-grid').forEach((g) => {
            if (g._chart) g._chart.destroy();
          });
          selectedContainer.innerHTML = '';
          if (data.defects.length === 0) {
            const box = document.createElement('div');
            box.className = 'chart-item chart-small';
            const title = document.createElement('h4');
            title.className = 'chart-title';
            title.textContent = 'Nenhum defeito (0)';
            box.appendChild(title);
            const grid = document.createElement('div');
            grid.className = 'grafico-grid';
            grid.dataset.errorId = '';
            box.appendChild(grid);
            selectedContainer.appendChild(box);
          } else {
            data.defects.forEach((def) => {
              const box = document.createElement('div');
              box.className = 'chart-item chart-small';

              const title = document.createElement('h4');
              title.className = 'chart-title';
              title.textContent = `${def.id} - ${def.name} (${def.total})`;
              box.appendChild(title);

              const grid = document.createElement('div');
              grid.className = 'grafico-grid';
              grid.dataset.errorId = def.id;
              box.appendChild(grid);

              selectedContainer.appendChild(box);
            });
          }
          updateLayout();
        }
      });
  }

  function renderSelectedDefects() {
    selectedContainer.innerHTML = '';
    selectedDefects.forEach(({ box }) => {
      selectedContainer.appendChild(box);
    });
    updateLayout();
  }

  function updateSelectedDefectCounts() {
    if (selectedDefects.size === 0) return Promise.resolve();
    const params = buildParams();
    selectedDefects.forEach((_, id) => params.append('id', id));
    return fetch(`/get_top_defects?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          const totals = new Map();
          data.defects.forEach((def) => {
            totals.set(String(def.id), def.total);
          });
          selectedDefects.forEach(({ box, item, name }, id) => {
            const count = totals.get(String(id)) || 0;
            const text = `${id} - ${name} (${count})`;
            const titleEl = box.querySelector('.chart-title');
            if (titleEl) titleEl.textContent = text;
            const spanEl = item.querySelector('span');
            if (spanEl) spanEl.textContent = text;
          });
        }
      });
  }

  function refreshAll() {
    const tasks = [fetchTotals(), loadTop3()];
    if (selectedDefects.size > 0) {
      renderSelectedDefects();
      tasks.push(updateSelectedDefectCounts());
    } else if (showingTop) {
      tasks.push(loadTopDefects());
    } else {
      selectedContainer.querySelectorAll('.grafico-grid').forEach((g) => {
        if (g._chart) g._chart.destroy();
      });
      selectedContainer.innerHTML = '';
    }
    return Promise.all(tasks).then(() => {
      const chartTasks = [];
      const mainGrid = document.querySelector('.chart-item.chart-hoje .grafico-grid');
      if (mainGrid) chartTasks.push(renderUChart(mainGrid));
      document.querySelectorAll('.top3-row .grafico-grid').forEach((grid) => {
        const id = grid.dataset.errorId;
        if (id) chartTasks.push(renderUChart(grid, id));
      });
      selectedContainer.querySelectorAll('.grafico-grid').forEach((grid) => {
        const id = grid.dataset.errorId;
        if (id) chartTasks.push(renderUChart(grid, id));
      });
      return Promise.all(chartTasks);
    });
  }

  function updateLastUpdate() {
    if (!lastUpdateEl) return;
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const date = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}`;
    const time = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    lastUpdateEl.textContent = `Última atualização: ${date} ${time}`;
  }

  function refreshAndUpdate() {
    return refreshAll().then(updateLastUpdate);
  }

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

    function updateSidebarVisibility() {
      clearAllBtn.style.display = selectedDefects.size > 0 ? '' : 'none';
    }

      clearAllBtn.addEventListener('click', () => {
        selectedDefects.forEach(({ box, item }) => {
          const gridEl = box.querySelector('.grafico-grid');
          if (gridEl && gridEl._chart) gridEl._chart.destroy();
          if (box.parentNode) selectedContainer.removeChild(box);
          if (item.parentNode) sidebarList.removeChild(item);
        });
        selectedDefects.clear();
        showingTop = false;
        selectedContainer.innerHTML = '';
        updateLayout();
        updateSidebarVisibility();
        refreshAndUpdate();
      });

    defectSelect.addEventListener('change', () => {
      const value = defectSelect.value;
      if (value) {
        const [id, name] = value.split(' - ');
          if (!selectedDefects.has(id)) {
            if (showingTop) {
              selectedContainer.querySelectorAll('.grafico-grid').forEach((g) => {
                if (g._chart) g._chart.destroy();
              });
              selectedContainer.innerHTML = '';
              showingTop = false;
            }
            const box = document.createElement('div');
            box.className = 'chart-item chart-small selected-defect';

          const title = document.createElement('h4');
          title.className = 'chart-title';
          title.textContent = `${id} - ${name}`;
          box.appendChild(title);

          const grid = document.createElement('div');
          grid.className = 'grafico-grid';
          grid.dataset.errorId = id;
          box.appendChild(grid);

          const closeBtn = document.createElement('button');
          closeBtn.className = 'close-btn';
          closeBtn.textContent = '✕';

          const item = document.createElement('div');
          item.className = 'sidebar-selected-defect';
          const nameSpan = document.createElement('span');
          nameSpan.textContent = `${id} - ${name}`;
          item.appendChild(nameSpan);
          const removeBtn = document.createElement('button');
          removeBtn.className = 'remove-defect-btn';
          removeBtn.textContent = '✕';
          item.appendChild(removeBtn);

          const remove = (e) => {
            if (e) e.stopPropagation();
            const gridEl = box.querySelector('.grafico-grid');
            if (gridEl && gridEl._chart) gridEl._chart.destroy();
            selectedContainer.removeChild(box);
            sidebarList.removeChild(item);
            selectedDefects.delete(id);
            if (selectedDefects.size === 0) {
              selectedContainer.innerHTML = '';
              showingTop = false;
            }
            updateLayout();
            updateSidebarVisibility();
            updateSelectedDefectCounts().then(updateLastUpdate);
          };

          closeBtn.addEventListener('click', remove);
          removeBtn.addEventListener('click', remove);

          box.appendChild(closeBtn);

          selectedContainer.appendChild(box);
          sidebarList.appendChild(item);
          selectedDefects.set(id, { box, item, name });
          updateLayout();
          updateSidebarVisibility();
          Promise.all([renderUChart(grid, id), updateSelectedDefectCounts()]).then(updateLastUpdate);
        }
      }

      defectSelect.value = '';
    });
  }

  if (defectQuantityOk) {
    defectQuantityOk.addEventListener('click', () => {
      if (selectedDefects.size > 0) {
        selectedDefects.forEach(({ box, item }) => {
          if (box.parentNode) selectedContainer.removeChild(box);
          if (item.parentNode) sidebarList.removeChild(item);
        });
        selectedDefects.clear();
        updateLayout();
        if (clearAllBtn) clearAllBtn.style.display = 'none';
      }
      selectedContainer.innerHTML = '';
      showingTop = true;
      refreshAndUpdate();
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
      refreshAndUpdate();
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
          refreshAndUpdate();
        };

        removeBtn.addEventListener('click', remove);

        cellSidebar.appendChild(item);
        selectedCells.set(dbValue, item);
        updateCellSidebarVisibility();
        refreshAndUpdate();
      }

      cellSelect.value = '';
    });

    updateCellSidebarVisibility();
  }

  if (updateNowBtn) updateNowBtn.addEventListener('click', refreshAndUpdate);

  refreshAndUpdate();
  setInterval(refreshAndUpdate, 5 * 60 * 1000);
});
