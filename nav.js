document.addEventListener('DOMContentLoaded', function() {
  // Get the current page filename
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  
  // Create the navigation HTML
  const navHTML = `
    <nav class="main-nav">
      <a href="watched_dramas.html" class="${currentPage === 'watched_dramas.html' ? 'active' : ''}">
        <i class="fas fa-th-large"></i> My Collection
      </a>
      <a href="collection_stats.html" class="${currentPage === 'collection_stats.html' ? 'active' : ''}">
        <i class="fas fa-chart-pie"></i> Statistics
      </a>
      <a href="get_list.html" class="${currentPage === 'get_list.html' ? 'active' : ''}">
        <i class="fas fa-plus-circle"></i> Add Shows
      </a>
    </nav>
  `;
  
  // Find the h1 element to insert the navigation after
  const h1Element = document.querySelector('h1');
  if (h1Element) {
    // Insert the navigation after the h1
    h1Element.insertAdjacentHTML('afterend', navHTML);
  }
});