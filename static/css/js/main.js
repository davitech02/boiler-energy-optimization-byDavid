document.addEventListener('DOMContentLoaded', function () {
    const theme = {
        primary: '#4682B4',
        secondary: '#2E8B57',
        background: '#F5F6F5'
    };

    function renderChart(divId, data, chartName) {
        const chartDiv = document.getElementById(divId);
        if (!chartDiv) {
            console.error(`Plotly: #${divId} div not found`);
            return;
        }
        try {
            // Ensure chart div is visible
            chartDiv.style.display = 'block';
            chartDiv.style.visibility = 'visible';
            
            if (data && data.data && data.layout) {
                console.log(`Plotly: Rendering ${chartName} with data:`, JSON.stringify(data).slice(0, 200) + '...');
                data.layout = {
                    ...data.layout,
                    plot_bgcolor: theme.background,
                    paper_bgcolor: theme.background,
                    font: { color: theme.primary },
                    xaxis: { gridcolor: theme.secondary },
                    yaxis: { gridcolor: theme.secondary },
                    margin: { t: 50, b: 50, l: 50, r: 50 },
                    height: 400,
                    hovermode: 'x unified'
                };
                Plotly.newPlot(divId, data.data, data.layout);
            } else {
                console.error(`Plotly: Invalid ${chartName} data`);
                chartDiv.innerHTML = `<p class="text-danger">Error: ${chartName} data not found.</p>`;
            }
        } catch (e) {
            console.error(`Plotly: Error rendering ${chartName}:`, e);
            chartDiv.innerHTML = `<p class="text-danger">Error loading ${chartName}: ${e.message}</p>`;
        }
    }

    const form = document.getElementById('boiler-form');
    const optimizeBtn = document.getElementById('optimize-btn');
    const resultsSection = document.getElementById('results-section');
    const noResults = document.getElementById('no-results');
    const energyResults = document.getElementById('energy-results');
    const sensitivityResults = document.getElementById('sensitivity-results');
    const loading = document.getElementById('loading');

    form.addEventListener('submit', async function (event) {
        event.preventDefault();
        
        // Show loading indicator
        noResults.classList.add('d-none');
        resultsSection.classList.add('d-none');
        loading.classList.remove('d-none');
        energyResults.classList.remove('d-none');
        sensitivityResults.classList.add('d-none');
        optimizeBtn.disabled = true;

        const formData = new FormData(form);
        const data = {
            feedwater_temp: parseFloat(formData.get('feedwater_temp')),
            steam_pressure: parseFloat(formData.get('steam_pressure')),
            fuel_flow: parseFloat(formData.get('fuel_flow')),
            efficiency: parseFloat(formData.get('efficiency'))
        };

        if (isNaN(data.feedwater_temp) || isNaN(data.steam_pressure) || isNaN(data.fuel_flow) || isNaN(data.efficiency)) {
            noResults.textContent = 'Error: All inputs must be valid numbers.';
            noResults.classList.remove('d-none');
            loading.classList.add('d-none');
            optimizeBtn.disabled = false;
            return;
        }

        console.log('Submitting form data:', data);

        try {
            const response = await fetch('/api/optimize', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            console.log('API response:', result);

            if (result.error || result.status === 'error') {
                throw new Error(result.error || 'Unknown API error');
            }

            if (result.results && result.status === 'success') {
                document.getElementById('current_energy').textContent = result.results.current_energy.toFixed(2);
                document.getElementById('output_energy').textContent = result.results.output_energy.toFixed(2);
                document.getElementById('savings').textContent = result.results.savings.toFixed(2);
                document.getElementById('optimized_efficiency').textContent = result.results.optimized_efficiency.toFixed(2);
                
                // Ensure results section is visible
                resultsSection.classList.remove('d-none');
                energyResults.classList.remove('d-none');

                // Render charts
                renderChart('energy-chart', result.plot_json, 'Energy Consumption Chart');
                if (result.sensitivity_json) {
                    sensitivityResults.classList.remove('d-none');
                    renderChart('sensitivity-chart', result.sensitivity_json, 'Sensitivity Analysis Chart');
                }
            } else {
                throw new Error('No results in response');
            }
        } catch (e) {
            console.error('Error fetching data:', e);
            noResults.textContent = `Error processing form: ${e.message}. Please check inputs and try again.`;
            noResults.classList.remove('d-none');
        } finally {
            loading.classList.add('d-none');
            optimizeBtn.disabled = false;
        }
    });
});