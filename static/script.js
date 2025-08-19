// Sidebar minimizável e accordion funcional
document.addEventListener('DOMContentLoaded', () => {
	// Sidebar toggle (hamburguer)
	const sidebar = document.getElementById('sidebar');
	const hamburgerSidebarBtn = document.getElementById('hamburgerSidebarBtn');
	if (hamburgerSidebarBtn) {
		hamburgerSidebarBtn.addEventListener('click', () => {
			sidebar.classList.toggle('minimized');
		});
	}

	// Accordion logic: cada botão abre/fecha só seu conteúdo
	const accordionHeaders = document.querySelectorAll('.accordion-header');
	accordionHeaders.forEach(header => {
		header.addEventListener('click', function() {
			const content = this.nextElementSibling;
			const isOpen = content.classList.contains('open');
			if (isOpen) {
				content.classList.remove('open');
				this.classList.remove('active');
			} else {
				content.classList.add('open');
				this.classList.add('active');
			}
		});
	});

        // Todos fechados por padrão
        document.querySelectorAll('.accordion-content').forEach(c => c.classList.remove('open'));
        document.querySelectorAll('.accordion-header').forEach(h => h.classList.remove('active'));

        // Exibe campos de data personalizada quando necessário
        const dateFilter = document.getElementById('dateFilter');
        const customDateRange = document.getElementById('customDateRange');
        if (dateFilter && customDateRange) {
                const toggleCustomRange = () => {
                        customDateRange.style.display = (dateFilter.value === 'custom') ? 'flex' : 'none';
                };
                toggleCustomRange();
                dateFilter.addEventListener('change', toggleCustomRange);
        }
});
