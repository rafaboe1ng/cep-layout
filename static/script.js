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
});
