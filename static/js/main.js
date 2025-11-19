document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('boiler-form');
    const loadingIndicator = document.getElementById('loading');
    const resultsSection = document.getElementById('results-section');
    const energyResults = document.getElementById('energy-results');
    const sensitivityResults = document.getElementById('sensitivity-results');
    const noResults = document.getElementById('no-results');
    const mobileResultsSummary = document.getElementById('mobile-results-summary');
    
    // Initialize mobile results summary
    if (mobileResultsSummary) {
        mobileResultsSummary.classList.add('d-none');
    }
    
    // Form submission handler
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Show loading indicator
        loadingIndicator.classList.remove('d-none');
        resultsSection.classList.add('d-none');
        noResults.classList.add('d-none');
        if (mobileResultsSummary) {
            mobileResultsSummary.classList.add('d-none');
        }
        
        // Get form data
        const formData = {
            feedwater_temp: parseFloat(document.getElementById('feedwater_temp').value),
            steam_pressure: parseFloat(document.getElementById('steam_pressure').value),
            fuel_flow: parseFloat(document.getElementById('fuel_flow').value),
            efficiency: parseFloat(document.getElementById('efficiency').value)
        };
        
        // Validate inputs
        if (isNaN(formData.feedwater_temp) || isNaN(formData.steam_pressure) || 
            isNaN(formData.fuel_flow) || isNaN(formData.efficiency)) {
            showError('Please enter valid numeric values for all fields.');
            return;
        }
        
        if (formData.fuel_flow <= 0 || formData.efficiency <= 0 || formData.efficiency > 100) {
            showError('Fuel flow must be positive and efficiency must be between 0 and 100.');
            return;
        }
        
        // Send API request
        fetch('/api/optimize', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData),
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            if (data.status === 'success') {
                displayResults(data);
                
                // Scroll to results on mobile
                if (window.innerWidth < 992) {
                    setTimeout(() => {
                        resultsSection.scrollIntoView({ behavior: 'smooth' });
                    }, 100);
                }
            } else {
                showError(data.error || 'An unknown error occurred.');
            }
        })
        .catch(error => {
            showError('Error: ' + error.message);
        })
        .finally(() => {
            loadingIndicator.classList.add('d-none');
        });
    });
    
    // Display results function
    function displayResults(data) {
        // Update result values
        document.getElementById('current_energy').textContent = data.results.current_energy.toFixed(2);
        document.getElementById('output_energy').textContent = data.results.output_energy.toFixed(2);
        document.getElementById('savings').textContent = data.results.savings.toFixed(2);
        document.getElementById('optimized_efficiency').textContent = data.results.optimized_efficiency.toFixed(1);
        
        // Update mobile summary if it exists
        if (mobileResultsSummary) {
            document.getElementById('mobile-current-energy').textContent = data.results.current_energy.toFixed(2) + ' MJ/s';
            document.getElementById('mobile-savings').textContent = data.results.savings.toFixed(2) + ' MJ/s';
            mobileResultsSummary.classList.remove('d-none');
        }
        
        // Configure responsive layout for charts
        const chartConfig = {
            responsive: true,
            displayModeBar: true,
            displaylogo: false,
            modeBarButtonsToRemove: ['lasso2d', 'select2d']
        };
        
        // Display energy chart with responsive config
        Plotly.newPlot('energy-chart', data.plot_json.data, data.plot_json.layout, chartConfig);
        
        // Display sensitivity chart with responsive config
        Plotly.newPlot('sensitivity-chart', data.sensitivity_json.data, data.sensitivity_json.layout, chartConfig);
        
        // Make charts responsive to window resize
        window.addEventListener('resize', function() {
            Plotly.Plots.resize('energy-chart');
            Plotly.Plots.resize('sensitivity-chart');
        });
        
        // Show results section
        resultsSection.classList.remove('d-none');
        energyResults.classList.remove('d-none');
        sensitivityResults.classList.remove('d-none');
        noResults.classList.add('d-none');
    }
    
    // Error display function
    function showError(message) {
        loadingIndicator.classList.add('d-none');
        noResults.classList.remove('d-none');
        noResults.innerHTML = `<div class="alert alert-danger" role="alert"><i class="fas fa-exclamation-triangle me-2"></i>${message}</div>`;
        
        // Hide mobile results summary on error
        if (mobileResultsSummary) {
            mobileResultsSummary.classList.add('d-none');
        }
    }
    
    // Add input validation for numeric fields
    const numericInputs = document.querySelectorAll('input[type="number"]');
    numericInputs.forEach(input => {
        input.addEventListener('input', function() {
            if (this.value === '') return;
            
            const value = parseFloat(this.value);
            if (isNaN(value)) {
                this.classList.add('is-invalid');
            } else {
                this.classList.remove('is-invalid');
            }
        });
    });
    
    // Add smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth'
                });
            }
        });
    });
    
    // Add responsive behavior for navbar
    const navbarToggler = document.querySelector('.navbar-toggler');
    const navbarMenu = document.querySelector('#navbarNav');
    
    if (navbarToggler && navbarMenu) {
        document.querySelectorAll('#navbarNav .nav-link').forEach(link => {
            link.addEventListener('click', () => {
                if (window.innerWidth < 992) {
                    const bsCollapse = new bootstrap.Collapse(navbarMenu);
                    bsCollapse.hide();
                }
            });
        });
    }
});