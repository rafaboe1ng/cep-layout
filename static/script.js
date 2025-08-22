document.addEventListener('DOMContentLoaded', () => {
  const sidebar = document.getElementById('sidebar');
  const hamburgerSidebarBtn = document.getElementById('hamburgerSidebarBtn');
  const sidebarNavBtn = document.getElementById('sidebarNavBtn');
  const sidebarNavIcon = document.getElementById('sidebarNavIcon');

  function positionNavBtn() {
    if (sidebarNavBtn && sidebar) {
      sidebarNavBtn.style.left = sidebar.offsetWidth + 'px';
    }
  }
  positionNavBtn();
  window.addEventListener('resize', positionNavBtn);

  if (hamburgerSidebarBtn) {
    hamburgerSidebarBtn.addEventListener('click', function () {
      sidebar.classList.toggle('minimized');
      positionNavBtn();
    });
  }

  let onTopPage = true;
  function updateSidebarNavIcon(isTop) {
    if (sidebarNavIcon) {
      sidebarNavIcon.classList.toggle('up', !isTop);
    }
  }
  function togglePage() {
    const container = document.querySelector('.snap-container');
    if (onTopPage) {
      container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
      updateSidebarNavIcon(false);
    } else {
      container.scrollTo({ top: 0, behavior: 'smooth' });
      updateSidebarNavIcon(true);
    }
    onTopPage = !onTopPage;
  }
  if (sidebarNavBtn) {
    sidebarNavBtn.addEventListener('click', togglePage);
  }
  updateSidebarNavIcon(true);

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
  if (defectSelect && selectedContainer) {
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

    defectSelect.addEventListener('change', () => {
      const value = defectSelect.value;
      if (value && !selectedDefects.has(value)) {
        const box = document.createElement('div');
        box.className = 'chart-item chart-small selected-defect';
        const closeBtn = document.createElement('button');
        closeBtn.className = 'selected-defect-close';
        closeBtn.textContent = '×';
        closeBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          selectedContainer.removeChild(box);
          selectedDefects.delete(value);
          updateLayout();
        });
        box.appendChild(closeBtn);
        const title = document.createElement('h4');
        title.className = 'chart-title';
        title.textContent = value;
        box.appendChild(title);
        const grid = document.createElement('div');
        grid.className = 'grafico-grid';
        box.appendChild(grid);

        selectedContainer.appendChild(box);
        selectedDefects.set(value, box);
        updateLayout();
      }

      defectSelect.value = '';
    });
  }
});
