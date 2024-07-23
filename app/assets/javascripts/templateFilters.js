/**
 * Template filters
 * 
 * This JS enhances the templates page by adding a filter to enable the user to filter the templates by type and category.
 **/ 
(function () {
    const templateFilter = document.querySelector('.template-filter');
    const rowSelector = templateFilter.dataset.rowSelector;

    // Function to initialize event listeners on filter links
    function initializeFilterLinks() {
        document.querySelectorAll('.filter-list a').forEach(link => {
            link.addEventListener('click', handleFilterClick);
        });
    }

    // Handle click events on filter links
    function handleFilterClick(event) {
        event.preventDefault();
        const clickedLink = event.target;
        const filterGroup = clickedLink.closest('.filter-list');

        // Remove 'active' class and aria-current=true from all links in the current filter group
        filterGroup.querySelectorAll('a').forEach(link => link.classList.remove('active'));
        filterGroup.querySelectorAll('a').forEach(link => link.removeAttribute('aria-current'));

        // Add 'active' class to the clicked link
        clickedLink.classList.add('active');
        clickedLink.setAttribute('aria-current', 'true');

        // Apply filters based on the active selections
        applyFilters();
    }

    // Collect active filters and apply them to the rows
    function applyFilters() {
        const activeFilters = collectActiveFilters();
        filterRows(activeFilters);
    }

    // Collect active filters from the UI
    function collectActiveFilters() {
        const activeFilters = [];
        templateFilter.querySelectorAll('.filter-list').forEach(filterGroup => {
            const activeLink = filterGroup.querySelector('.active');
            activeFilters.push({
                target: filterGroup.dataset.target,
                value: activeLink.dataset.target
            });
        });
        return activeFilters;
    }

    // Apply active filters to rows, showing or hiding them as necessary
    function filterRows(activeFilters) {
        document.querySelectorAll(rowSelector).forEach(row => {
            const resetFilter = activeFilters.every(filter => filter.value === 'all');
            const shouldShow = activeFilters.every(filter => {
                return filter.value === 'all' || row.getAttribute(filter.target) === filter.value;
            });

            if (resetFilter) {
                row.style.display = '';
            } else {
                if (shouldShow) {
                    row.style.display = 'grid';
                } else {
                    row.style.display = 'none';
                }
            }
        });
        // reset the sticky footer buttons as the height of the list may have changed
        if ("stickAtBottomWhenScrolling" in GOVUK) {
            GOVUK.stickAtBottomWhenScrolling.recalculate();
        }
    }

    // Initialize the script
    initializeFilterLinks();
})();
