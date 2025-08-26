document.addEventListener('DOMContentLoaded', () => {
  const sidebar = document.getElementById('sidebar');
  const hamburgerSidebarBtn = document.getElementById('hamburgerSidebarBtn');
  if (hamburgerSidebarBtn) {
    hamburgerSidebarBtn.addEventListener('click', function () {
      sidebar.classList.toggle('minimized');
    });
  }

  // Mostrar custom-date-range só se for Personalizado
  const dateSelect = document.getElementById('dateFilter');
  const customRange = document.getElementById('customDateRange');
  function toggleCustomRange() {
    if (dateSelect.value === 'custom') {
      customRange.style.display = '';
    } else {
      customRange.style.display = 'none';
    }
  }
  if (dateSelect && customRange) {
    toggleCustomRange();
    dateSelect.addEventListener('change', toggleCustomRange);
  }

  // Atualiza gráficos conforme defeitos selecionados
  const defectSelect = document.getElementById('defectFilter');
  const selectedContainer = document.getElementById('selectedDefectsContainer');
  const sidebarList = document.getElementById('selectedDefectsSidebar');
  const clearAllBtn = document.getElementById('clearDefectsBtn');
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
});
