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
  const defectContainer = document.getElementById('defectFilter');
  const selectedContainer = document.getElementById('selectedDefectsContainer');
  if (defectContainer && selectedContainer) {
    const checkboxes = defectContainer.querySelectorAll('input[type="checkbox"]');
    function updateSelected() {
      selectedContainer.innerHTML = '';
      checkboxes.forEach(cb => {
        if (cb.checked) {
          const box = document.createElement('div');
          box.className = 'chart-item chart-small';
          const title = document.createElement('h4');
          title.className = 'chart-title';
          title.textContent = cb.value;
          box.appendChild(title);
          const grid = document.createElement('div');
          grid.className = 'grafico-grid';
          box.appendChild(grid);
          selectedContainer.appendChild(box);
        }
      });
    }
    checkboxes.forEach(cb => cb.addEventListener('change', updateSelected));
  }
});
