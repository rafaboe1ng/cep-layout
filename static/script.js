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
  const footerCellsEl = document.getElementById('footerCells');

  const toDbCell = (name) => name.replace('-', '').replace('UPS0', 'UPS');

  const formatDefectId = (id) => String(id).padStart(4, '0');

  const parseLocalDate = (str) => {
    const [y, m, d] = str.split('-').map(Number);
    return new Date(y, m - 1, d);
  };

  const parseLocalDateTime = (str) => {
    if (!str) return new Date();
    const [datePart, timePart = ""] = str.split("T");
    const [y, m, d] = datePart.split("-").map(Number);
    const [h = 0, mi = 0, s = 0] = timePart.split(":").map(Number);
    return new Date(Date.UTC(y, m - 1, d, h, mi, s));
  };

  const formatDateTime = (input) => {
    const date =
      input instanceof Date
        ? input
        : typeof input === 'number'
        ? new Date(input)
        : parseLocalDateTime(input);
    const datePart = date.toLocaleDateString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      day: '2-digit',
      month: '2-digit',
    });
    const timePart = date.toLocaleTimeString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    return timePart === '00:00' ? datePart : `${datePart} ${timePart}`;
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
        start = startDateInput.value ? parseLocalDate(startDateInput.value) : today;
        end = endDateInput.value ? parseLocalDate(endDateInput.value) : today;
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
          const filterText = dateSelect.options[dateSelect.selectedIndex].text;
          if (insp) insp.textContent = `Inspeções (${filterText}): ${data.total_inspections}`;
          if (def) def.textContent = `Defeitos (${filterText}): ${data.total_defects}`;
        }
      });
  }

  function updateFooterCells() {
    if (!footerCellsEl) return;
    if (selectedCells.size === 0) {
      footerCellsEl.textContent = 'UPS-01, UPS-02, UPS-07';
    } else {
      const cells = Array.from(selectedCells.keys()).map((c) => c.replace('UPS', 'UPS-0'));
      footerCellsEl.textContent = cells.join(', ');
    }
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

    // Reset any previous manual positioning
    items.forEach((item) => {
      item.style.gridRow = '';
      item.style.gridColumn = '';
      item.style.height = '';
    });

    if (count === 0) {
      selectedContainer.classList.remove('fill-grid');
      selectedContainer.style.gridTemplateColumns = '';
      selectedContainer.style.gridTemplateRows = '';
      selectedContainer.style.gridAutoRows = '';
      return;
    }

    // Enable full-height fill behavior scoped to this grid
    selectedContainer.classList.add('fill-grid');
    selectedContainer.style.minHeight = '0';
    selectedContainer.style.height = '100%';

    // Layout rules:
    // - 1: ocupa toda a área entre header/footer e sidebar
    // - pares: mesma quantidade em cima e embaixo, ocupando todo o espaço
    // - ímpares: o primeiro vale por 2 e segue a lógica do par

    if (count === 1) {
      selectedContainer.style.gridTemplateColumns = '1fr';
      selectedContainer.style.gridTemplateRows = 'minmax(0, 1fr)';
      selectedContainer.style.gridAutoRows = '';
      // First item fills all columns (only one column anyway)
      items[0].style.gridColumn = '1 / -1';
      items[0].style.height = '100%';
      return;
    }

    if (count === 2) {
      // 1 coluna, 2 linhas iguais
      selectedContainer.style.gridTemplateColumns = '1fr';
      selectedContainer.style.gridTemplateRows = 'repeat(2, minmax(0, 1fr))';
      selectedContainer.style.gridAutoRows = '';
      items.forEach((it, idx) => {
        it.style.height = '100%';
        it.style.gridColumn = '1 / span 1';
        it.style.gridRow = idx === 0 ? '1' : '2';
      });
      return;
    }

    if (count === 3) {
      // 2 colunas; 1ª linha: item 1 ocupa 2 colunas; 2ª linha: 2 itens
      selectedContainer.style.gridTemplateColumns = '1fr 1fr';
      selectedContainer.style.gridTemplateRows = 'repeat(2, minmax(0, 1fr))';
      selectedContainer.style.gridAutoRows = '';
      items.forEach((it) => (it.style.height = '100%'));
      items[0].style.gridColumn = '1 / span 2';
      items[0].style.gridRow = '1';
      if (items[1]) { items[1].style.gridColumn = '1'; items[1].style.gridRow = '2'; }
      if (items[2]) { items[2].style.gridColumn = '2'; items[2].style.gridRow = '2'; }
      return;
    }

    if (count === 4) {
      // 2 x 2, linhas com alturas iguais
      selectedContainer.style.gridTemplateColumns = '1fr 1fr';
      selectedContainer.style.gridTemplateRows = 'repeat(2, minmax(0, 1fr))';
      selectedContainer.style.gridAutoRows = '';
      items.forEach((it, idx) => {
        it.style.height = '100%';
        const col = (idx % 2) + 1; // 1..2
        const row = idx < 2 ? 1 : 2;
        it.style.gridColumn = String(col);
        it.style.gridRow = String(row);
      });
      return;
    }

    // 5 ou mais (ímpar ou par > 4)
    // Par: k = n/2 colunas e 2 linhas iguais
    // Ímpar: colunas = ceil((n+1)/2); item[0] ocupa 2 colunas na primeira linha
    if (count % 2 === 0) {
      // Par > 4: 2 linhas, n/2 colunas
      const cols = count / 2;
      selectedContainer.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
      selectedContainer.style.gridTemplateRows = 'repeat(2, minmax(0, 1fr))';
      selectedContainer.style.gridAutoRows = '';
      items.forEach((it, idx) => {
        it.style.height = '100%';
        const col = (idx % cols) + 1;
        const row = idx < cols ? 1 : 2;
        it.style.gridColumn = String(col);
        it.style.gridRow = String(row);
      });
    } else {
      // Ímpar >= 5: 2 linhas, ceil((n+1)/2) colunas; primeiro ocupa 2 colunas na linha 1
      const cols = Math.ceil((count + 1) / 2);
      selectedContainer.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
      selectedContainer.style.gridTemplateRows = 'repeat(2, minmax(0, 1fr))';
      selectedContainer.style.gridAutoRows = '';
      items.forEach((it) => (it.style.height = '100%'));
      // Primeiro ocupa 2 colunas na primeira linha
      items[0].style.gridColumn = '1 / span 2';
      items[0].style.gridRow = '1';
      // Quantos slots restam na linha de cima além do primeiro (que usa 2 colunas)?
      const topSlots = Math.max(0, cols - 2);
      // Preenche a linha de cima a partir da 3ª coluna
      for (let i = 0; i < topSlots; i++) {
        const idx = 1 + i;
        if (!items[idx]) break;
        items[idx].style.gridColumn = String(3 + i);
        items[idx].style.gridRow = '1';
      }
      // Restante vai para a 2ª linha, colunas de 1..cols
      let next = 1 + topSlots;
      for (let c = 1; c <= cols; c++) {
        if (!items[next]) break;
        items[next].style.gridColumn = String(c);
        items[next].style.gridRow = '2';
        next++;
      }
    }
  }

  function buildParams(extra = {}) {
    const { start, end } = getDateRange();
    const paramsObj = { start, end, ...extra };
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
        const angle = data.angle;
        const points = data.data
          .filter((d) => d.total_inspections > 0)
          .map((d) => ({
            x: parseLocalDateTime(d.date),
            u: d.u,
            trend: d.trend,
            ucl: d.ucl,
            lcl: d.lcl,
          }));
        const labels = points.map((p) => formatDateTime(p.x));
        const uData = points.map((p) => p.u);
        const trendData = errorId ? [] : points.map((p) => p.trend);
        const uclData = points.map((p) => p.ucl);
        const lclData = points.map((p) => p.lcl);
        const width = container.clientWidth || 300;
        let maxTicks = Math.max(2, Math.floor(width / 60));
        if (maxTicks > 10) maxTicks = 10;
        const latest = points[points.length - 1];
        const latestIso = latest ? latest.x.toISOString() : '';
        container.dataset.lastDate = latestIso;
        const ackDate = container.dataset.ackDate;
        const outOfControl =
          latest && (latest.u > latest.ucl || latest.u < latest.lcl);
        if (outOfControl && latestIso !== ackDate) {
          container.classList.add('blink-red');
        } else {
          container.classList.remove('blink-red');
        }

        if (!errorId) {
          const mainItem = container.closest('.chart-item');
          if (mainItem) {
            const title = mainItem.querySelector('.chart-title');
            if (title) {
              const angleFormatted = angle.toLocaleString('pt-BR', {
                minimumFractionDigits: 3,
                maximumFractionDigits: 3,
              });
              title.innerHTML = `DEFEITOS <span class="trend-angle" title="Angulação da linha de Tendência.">(${angleFormatted}°)</span>`;
            }
          }
        }
        const step = errorId ? 0.25 : 0.5;
        const maxValue = errorId
          ? Math.max(...uData, ...uclData, step)
          : Math.max(...uData, ...uclData, ...trendData, step);
        const yMax = Number((Math.ceil(maxValue / step) * step).toFixed(2));
        if (container._chart) {
          container._chart.destroy();
        }
        container.innerHTML = '';
        const canvas = document.createElement('canvas');
        canvas.style.backgroundColor = '#fff';
        container.appendChild(canvas);
        container._chart = new Chart(canvas.getContext("2d"), {
          type: "line",
          data: {
            labels,
            datasets: (() => {
              const ds = [
                {
                  label: "U",
                  data: uData,
                  borderColor: "blue",
                  fill: false,
                  spanGaps: true,
                  pointStyle: "line",
                },
              ];
              if (!errorId) {
                ds.push({
                  label: "Tendência",
                  data: trendData,
                  borderColor: "skyblue",
                  fill: false,
                  spanGaps: true,
                  pointStyle: "line",
                });
              }
              ds.push(
                {
                  label: "UCL",
                  data: uclData,
                  borderColor: "red",
                  borderDash: [5, 5],
                  fill: false,
                  spanGaps: true,
                  pointStyle: "line",
                },
                {
                  label: "LCL",
                  data: lclData,
                  borderColor: "yellow",
                  borderDash: [5, 5],
                  fill: false,
                  spanGaps: true,
                  pointStyle: "line",
                }
              );
              return ds;
            })(),
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              x: {
                type: "category",
                ticks: {
                  maxRotation: 0,
                  autoSkip: true,
                  autoSkipPadding: 40,
                  maxTicksLimit: maxTicks,
                },
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
            elements: {
              point: {
                radius: 0,
              },
            },
            plugins: {
              legend: {
                labels: {
                  usePointStyle: true,
                },
              },
              tooltip: {
                callbacks: {
                  title: (ctx) => ctx[0].label,
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
              if (defect) {
                title.innerHTML = `<span class="defect-name">${formatDefectId(defect.id)} - ${defect.name}</span> <span class="defect-count" title="Quantidade de Ocorrências.">(${defect.total})</span>`;
              } else {
                title.innerHTML = '<span class="defect-name">-</span> <span class="defect-count" title="Quantidade de Ocorrências.">(0)</span>';
              }
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
            title.innerHTML = '<span class="defect-name">Nenhum defeito</span> <span class="defect-count" title="Quantidade de Ocorrências.">(0)</span>';
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
              title.innerHTML = `<span class="defect-name">${formatDefectId(def.id)} - ${def.name}</span> <span class="defect-count" title="Quantidade de Ocorrências.">(${def.total})</span>`;
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
          selectedDefects.forEach(({ box, item }, id) => {
            const count = totals.get(String(id)) || 0;
            const titleCount = box.querySelector('.defect-count');
            if (titleCount) titleCount.textContent = `(${count})`;
            const sideCount = item.querySelector('.defect-count');
            if (sideCount) sideCount.textContent = `(${count})`;
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
    const date = now.toLocaleDateString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    const time = now.toLocaleTimeString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
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
            const text = `${formatDefectId(err.id)} - ${err.name}`;
            option.value = `${err.id} - ${err.name}`;
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
        const paddedId = formatDefectId(id);
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
          title.innerHTML = `<span class="defect-name">${paddedId} - ${name}</span> <span class="defect-count" title="Quantidade de Ocorrências.">(0)</span>`;
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
          const info = document.createElement('div');
          info.className = 'defect-info';
          const countSpan = document.createElement('span');
          countSpan.className = 'defect-count';
          countSpan.textContent = '(0)';
          countSpan.title = 'Quantidade de Ocorrências.';
          const nameSpan = document.createElement('span');
          nameSpan.className = 'defect-name';
          nameSpan.textContent = `${paddedId} - ${name}`;
          info.appendChild(nameSpan);
          info.appendChild(countSpan);
          item.appendChild(info);
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
      updateFooterCells();
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
          updateFooterCells();
          refreshAndUpdate();
        };

        removeBtn.addEventListener('click', remove);

        cellSidebar.appendChild(item);
        selectedCells.set(dbValue, item);
        updateCellSidebarVisibility();
        updateFooterCells();
        refreshAndUpdate();
      }

      cellSelect.value = '';
    });

    updateCellSidebarVisibility();
    updateFooterCells();
  }

  if (updateNowBtn)
    updateNowBtn.addEventListener('click', () => {
      refreshAndUpdate().then(() => {
        document.querySelectorAll('.grafico-grid').forEach((grid) => {
          const lastDate = grid.dataset.lastDate || '';
          grid.dataset.ackDate = lastDate;
          grid.classList.remove('blink-red');
        });
      });
    });

  if (defectQuantityOk) {
    defectQuantityOk.click();
  } else {
    refreshAndUpdate();
  }
  setInterval(refreshAndUpdate, 5 * 60 * 1000);
});
