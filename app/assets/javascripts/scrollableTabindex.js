/**
 * Manages tabindex for elements with overflow-x-auto to improve accessibility.
 * Only makes elements keyboard focusable when they actually have horizontal scroll.
 */

console.log('ScrollableTabindex module loaded');

function updateScrollableTabindex() {
  // Find all elements that might need tabindex management for overflow
  const containers = document.querySelectorAll('[data-overflow-tabindex]');
  console.log('Found containers with data-overflow-tabindex:', containers.length);
  
  containers.forEach(container => {
    // Check if content actually overflows horizontally
    const hasHorizontalScroll = container.scrollWidth > container.clientWidth;
    console.log('Updating tabindex for container:', container, 'Has horizontal scroll:', hasHorizontalScroll);
    container.tabIndex = hasHorizontalScroll ? 0 : -1;
  });
}

function initScrollableTabindex() {
  console.log('Initializing scrollable tabindex, DOM ready state:', document.readyState);
  // Update on load
  updateScrollableTabindex();
  
  // Update on resize
  window.addEventListener('resize', updateScrollableTabindex);
  
  // Update when content might change (for dynamic content)
  const observer = new MutationObserver(updateScrollableTabindex);
  const containers = document.querySelectorAll('[data-overflow-tabindex]');
  
  containers.forEach(container => {
    observer.observe(container, {
      childList: true,
      subtree: true,
      attributes: false
    });
  });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initScrollableTabindex);
} else {
  initScrollableTabindex();
}
