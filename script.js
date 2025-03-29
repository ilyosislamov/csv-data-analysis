document.getElementById('csvFile').addEventListener('change', handleFileSelect);

function handleFileSelect(event) {
    const file = event.target.files[0];
    Papa.parse(file, {
        header: true,
        dynamicTyping: true,
        complete: function(results) {
            analyzeData(results.data);
        }
    });
}

function analyzeData(data) {
    // Show analysis section
    document.getElementById('analysisResults').classList.remove('hidden');

    // Generate summary statistics
    const summary = generateSummary(data);
    displaySummary(summary);

    // Display data preview
    displayDataPreview(data);

    // Create visualizations
    createVisualizations(data);
}

function generateSummary(data) {
    const summary = {};
    const columns = Object.keys(data[0]);

    columns.forEach(column => {
        const values = data.map(row => row[column]).filter(val => val !== null && val !== undefined);
        const numericValues = values.filter(val => typeof val === 'number');

        summary[column] = {
            type: numericValues.length === values.length ? 'numeric' : 'categorical',
            count: values.length,
            uniqueValues: new Set(values).size
        };

        if (summary[column].type === 'numeric') {
            summary[column].min = Math.min(...numericValues);
            summary[column].max = Math.max(...numericValues);
            summary[column].mean = numericValues.reduce((a, b) => a + b, 0) / numericValues.length;
            summary[column].median = getMedian(numericValues);
        } else {
            const frequencies = values.reduce((acc, val) => {
                acc[val] = (acc[val] || 0) + 1;
                return acc;
            }, {});
            summary[column].topCategories = Object.entries(frequencies)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 3);
        }
    });

    return summary;
}

function getMedian(numbers) {
    const sorted = numbers.slice().sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
        ? (sorted[middle - 1] + sorted[middle]) / 2
        : sorted[middle];
}

function displaySummary(summary) {
    const summaryDiv = document.getElementById('summary');
    let html = '<div class="table-responsive"><table class="table table-bordered">';
    html += '<thead><tr><th>Column</th><th>Type</th><th>Count</th><th>Unique Values</th><th>Statistics</th></tr></thead><tbody>';

    for (const [column, stats] of Object.entries(summary)) {
        html += `<tr>
            <td>${column}</td>
            <td>${stats.type}</td>
            <td>${stats.count}</td>
            <td>${stats.uniqueValues}</td>
            <td>`;

        if (stats.type === 'numeric') {
            html += `Min: ${stats.min.toFixed(2)}<br>
                    Max: ${stats.max.toFixed(2)}<br>
                    Mean: ${stats.mean.toFixed(2)}<br>
                    Median: ${stats.median.toFixed(2)}`;
        } else {
            html += 'Top categories:<br>' + 
                   stats.topCategories.map(([cat, count]) => `${cat}: ${count}`).join('<br>');
        }

        html += '</td></tr>';
    }

    html += '</tbody></table></div>';
    summaryDiv.innerHTML = html;
}

function displayDataPreview(data) {
    const table = document.getElementById('dataTable');
    const headers = Object.keys(data[0]);

    // Create header
    let headerHtml = '<tr>';
    headers.forEach(header => {
        headerHtml += `<th>${header}</th>`;
    });
    headerHtml += '</tr>';
    table.querySelector('thead').innerHTML = headerHtml;

    // Create body (first 10 rows)
    let bodyHtml = '';
    data.slice(0, 10).forEach(row => {
        bodyHtml += '<tr>';
        headers.forEach(header => {
            bodyHtml += `<td>${row[header]}</td>`;
        });
        bodyHtml += '</tr>';
    });
    table.querySelector('tbody').innerHTML = bodyHtml;
}

function createVisualizations(data) {
    // Get numerical columns
    const numericalColumns = Object.keys(data[0]).filter(column => {
        return data.every(row => typeof row[column] === 'number' || row[column] === null);
    });

    if (numericalColumns.length > 0) {
        createDistributionChart(data, numericalColumns[0]);
        if (numericalColumns.length > 1) {
            createCorrelationMatrix(data, numericalColumns);
        }
    }
}

function createDistributionChart(data, column) {
    const values = data.map(row => row[column]).filter(val => val !== null);
    const ctx = document.getElementById('distributionChart').getContext('2d');
    
    // Create histogram bins
    const binCount = Math.min(20, Math.ceil(Math.sqrt(values.length)));
    const min = Math.min(...values);
    const max = Math.max(...values);
    const binWidth = (max - min) / binCount;
    
    const bins = Array(binCount).fill(0);
    values.forEach(value => {
        const binIndex = Math.min(Math.floor((value - min) / binWidth), binCount - 1);
        bins[binIndex]++;
    });

    const labels = bins.map((_, i) => (min + (i + 0.5) * binWidth).toFixed(2));

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: `Distribution of ${column}`,
                data: bins,
                backgroundColor: 'rgba(54, 162, 235, 0.5)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Frequency'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: column
                    }
                }
            }
        }
    });
}

function createCorrelationMatrix(data, columns) {
    const ctx = document.getElementById('correlationChart').getContext('2d');
    
    // Calculate correlation matrix
    const correlationMatrix = [];
    columns.forEach(col1 => {
        const row = [];
        columns.forEach(col2 => {
            const correlation = calculateCorrelation(data, col1, col2);
            row.push(correlation);
        });
        correlationMatrix.push(row);
    });

    new Chart(ctx, {
        type: 'heatmap',
        data: {
            labels: columns,
            datasets: correlationMatrix.map((row, i) => ({
                label: columns[i],
                data: row.map((value, j) => ({
                    x: columns[j],
                    y: columns[i],
                    value: value
                }))
            }))
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: (context) => {
                            return `Correlation: ${context.raw.value.toFixed(2)}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    type: 'category',
                    title: {
                        display: true,
                        text: 'Variables'
                    }
                },
                y: {
                    type: 'category',
                    title: {
                        display: true,
                        text: 'Variables'
                    }
                }
            }
        }
    });
}

function calculateCorrelation(data, col1, col2) {
    const pairs = data
        .map(row => [row[col1], row[col2]])
        .filter(pair => pair[0] !== null && pair[1] !== null);

    const n = pairs.length;
    if (n === 0) return 0;

    const sum1 = pairs.reduce((acc, pair) => acc + pair[0], 0);
    const sum2 = pairs.reduce((acc, pair) => acc + pair[1], 0);
    const sum1Sq = pairs.reduce((acc, pair) => acc + pair[0] * pair[0], 0);
    const sum2Sq = pairs.reduce((acc, pair) => acc + pair[1] * pair[1], 0);
    const pSum = pairs.reduce((acc, pair) => acc + pair[0] * pair[1], 0);

    const num = (n * pSum) - (sum1 * sum2);
    const den = Math.sqrt((n * sum1Sq - sum1 * sum1) * (n * sum2Sq - sum2 * sum2));

    return den === 0 ? 0 : num / den;
}
