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
    defectSelect.addEventListener('change', () => {
      selectedContainer.innerHTML = '';
      Array.from(defectSelect.selectedOptions).forEach(opt => {
        const box = document.createElement('div');
        box.className = 'chart-item chart-small';
        const title = document.createElement('h4');
        title.className = 'chart-title';
        title.textContent = opt.value;
        box.appendChild(title);
        const grid = document.createElement('div');
        grid.className = 'grafico-grid';
        box.appendChild(grid);
        selectedContainer.appendChild(box);
      });
    });
  }
});
