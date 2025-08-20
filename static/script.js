document.addEventListener('DOMContentLoaded', () => {
  const sidebar = document.getElementById('sidebar');
  const hamburgerSidebarBtn = document.getElementById('hamburgerSidebarBtn');
  if (hamburgerSidebarBtn) {
    hamburgerSidebarBtn.addEventListener('click', function () {
      sidebar.classList.toggle('minimized');
    });
  }

  document.querySelectorAll('.accordion-header').forEach(header => {
    header.addEventListener('click', () => {
      const content = header.nextElementSibling;
      content.classList.toggle('open');
    });
  });

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

        box.addEventListener('click', () => {
          selectedContainer.removeChild(box);
          selectedDefects.delete(value);
        });

        selectedContainer.appendChild(box);
        selectedDefects.set(value, box);
      }

      defectSelect.value = '';
      const content = defectSelect.closest('.accordion-content');
      if (content) {
        content.classList.remove('open');
      }

      const sidebar = document.getElementById('sidebar');
      if (sidebar) {
        sidebar.classList.remove('minimized');
      }
    });
  }
});
