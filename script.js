document.getElementById('csvFile').addEventListener('change', handleFileSelect);

function handleFileSelect(event) {
    const file = event.target.files[0];
    Papa.parse(file, {
        header: true,
        dynamicTyping: true,
        complete: function(results) {
            // Preprocess the data to calculate lead times and delays
            const processedData = preprocessData(results.data);
            analyzeData(processedData);
        }
    });
}

function preprocessData(data) {
    return data.map(row => {
        // Convert date strings to Date objects
        const orderDate = new Date(row.Order_Date);
        const expectedDate = new Date(row.Expected_Delivery_Date);
        const actualDate = new Date(row.Actual_Delivery_Date);

        // Calculate lead time (actual delivery - order date in days)
        const leadTime = Math.ceil((actualDate - orderDate) / (1000 * 60 * 60 * 24));

        // Calculate delay (actual - expected delivery in days)
        const delay = Math.ceil((actualDate - expectedDate) / (1000 * 60 * 60 * 24));

        // Extract month from order date
        const month = orderDate.toLocaleString('default', { month: 'long' });

        return {
            ...row,
            LeadTime: leadTime,
            DelayDuration: delay,
            Month: month
        };
    });
}

function analyzeData(data) {
    // Show analysis section
    document.getElementById('analysisResults').classList.remove('hidden');

    // Simple Questions Analysis
    analyzeLeadTimes(data);
    analyzeDelays(data);

    // Complex Analysis
    analyzeTransportationImpact(data);
    analyzeSeasonalPatterns(data);
    analyzeBullwhipEffect(data);
    analyzeVariabilityCorrelation(data);

    // Display data preview
    displayDataPreview(data);
}

function analyzeLeadTimes(data) {
    // Supplier Lead Time Analysis
    const supplierLeadTimes = groupAndAverage(data, 'Supplier', 'LeadTime');
    const topSupplier = Object.entries(supplierLeadTimes)
        .sort((a, b) => b[1] - a[1])[0];
    
    document.getElementById('supplierLeadTime').innerHTML = `
        <p><strong>Highest Average Lead Time Supplier:</strong> ${topSupplier[0]} (${topSupplier[1].toFixed(2)} days)</p>
    `;

    // Transportation Mode Analysis
    const transportLeadTimes = groupAndAverage(data, 'Transportation_Mode', 'LeadTime');
    const bestTransport = Object.entries(transportLeadTimes)
        .sort((a, b) => a[1] - b[1])[0];
    
    document.getElementById('transportationLeadTime').innerHTML = `
        <p><strong>Lowest Average Lead Time Transport:</strong> ${bestTransport[0]} (${bestTransport[1].toFixed(2)} days)</p>
    `;

    // Product Category Analysis
    const categoryLeadTimes = groupAndAverage(data, 'Product_Category', 'LeadTime');
    const bestCategory = Object.entries(categoryLeadTimes)
        .sort((a, b) => a[1] - b[1])[0];
    
    document.getElementById('productCategoryLeadTime').innerHTML = `
        <p><strong>Shortest Lead Time Category:</strong> ${bestCategory[0]} (${bestCategory[1].toFixed(2)} days)</p>
    `;
}

function analyzeDelays(data) {
    // Monthly Delays Analysis
    const monthlyDelays = groupAndAverage(data, 'Month', 'DelayDuration');
    const worstMonth = Object.entries(monthlyDelays)
        .sort((a, b) => b[1] - a[1])[0];
    
    document.getElementById('monthlyDelays').innerHTML = `
        <p><strong>Highest Average Delay Month:</strong> ${worstMonth[0]} (${worstMonth[1].toFixed(2)} days)</p>
    `;

    // Disruption Type Analysis
    const disruptionDelays = groupAndAverage(data, 'Disruption_Type', 'DelayDuration');
    const worstDisruption = Object.entries(disruptionDelays)
        .sort((a, b) => b[1] - a[1])[0];
    
    document.getElementById('disruptionDelays').innerHTML = `
        <p><strong>Longest Average Delay Cause:</strong> ${worstDisruption[0]} (${worstDisruption[1].toFixed(2)} days)</p>
    `;
}

function analyzeTransportationImpact(data) {
    const transportDelays = {};
    const transportCounts = {};
    
    data.forEach(row => {
        if (row.Transportation_Mode && row.DelayDuration) {
            if (!transportDelays[row.Transportation_Mode]) {
                transportDelays[row.Transportation_Mode] = 0;
                transportCounts[row.Transportation_Mode] = 0;
            }
            transportDelays[row.Transportation_Mode] += row.DelayDuration;
            transportCounts[row.Transportation_Mode]++;
        }
    });

    const avgDelays = Object.keys(transportDelays).map(mode => ({
        mode,
        avgDelay: transportDelays[mode] / transportCounts[mode]
    }));

    const ctx = document.getElementById('transportationImpactChart').getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: avgDelays.map(d => d.mode),
            datasets: [{
                label: 'Average Delay Duration (days)',
                data: avgDelays.map(d => d.avgDelay),
                backgroundColor: 'rgba(54, 162, 235, 0.5)'
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Average Delay (days)'
                    }
                }
            }
        }
    });
}

function analyzeSeasonalPatterns(data) {
    const monthlyLeadTimes = groupAndAverage(data, 'Month', 'LeadTime');
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                   'July', 'August', 'September', 'October', 'November', 'December'];
    
    const ctx = document.getElementById('seasonalPatternChart').getContext('2d');
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: months,
            datasets: [{
                label: 'Average Lead Time',
                data: months.map(month => monthlyLeadTimes[month] || 0),
                borderColor: 'rgba(75, 192, 192, 1)',
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Average Lead Time (days)'
                    }
                }
            }
        }
    });
}

function analyzeBullwhipEffect(data) {
    const monthlyDemand = {};
    const monthlyOrders = {};
    
    data.forEach(row => {
        if (row.Month) {
            if (!monthlyDemand[row.Month]) {
                monthlyDemand[row.Month] = [];
                monthlyOrders[row.Month] = [];
            }
            if (row.Customer_Demand) monthlyDemand[row.Month].push(row.Customer_Demand);
            if (row.Order_Quantity) monthlyOrders[row.Month].push(row.Order_Quantity);
        }
    });

    const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                   'July', 'August', 'September', 'October', 'November', 'December'];
    
    const ctx = document.getElementById('bullwhipChart').getContext('2d');
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: months,
            datasets: [
                {
                    label: 'Customer Demand Variability',
                    data: months.map(month => calculateCV(monthlyDemand[month])),
                    borderColor: 'rgba(75, 192, 192, 1)',
                    tension: 0.1
                },
                {
                    label: 'Order Quantity Variability',
                    data: months.map(month => calculateCV(monthlyOrders[month])),
                    borderColor: 'rgba(255, 99, 132, 1)',
                    tension: 0.1
                }
            ]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Coefficient of Variation'
                    }
                }
            }
        }
    });
}

function analyzeVariabilityCorrelation(data) {
    const monthlyData = {};
    
    data.forEach(row => {
        if (row.Month && row.Order_Quantity && row.LeadTime) {
            if (!monthlyData[row.Month]) {
                monthlyData[row.Month] = {
                    orders: [],
                    leadTimes: []
                };
            }
            monthlyData[row.Month].orders.push(row.Order_Quantity);
            monthlyData[row.Month].leadTimes.push(row.LeadTime);
        }
    });

    const variabilityData = Object.entries(monthlyData).map(([month, data]) => ({
        month,
        orderCV: calculateCV(data.orders),
        leadTimeCV: calculateCV(data.leadTimes)
    }));

    const ctx = document.getElementById('variabilityCorrelationChart').getContext('2d');
    new Chart(ctx, {
        type: 'scatter',
        data: {
            datasets: [{
                label: 'Order Variability vs Lead Time Variability',
                data: variabilityData.map(d => ({
                    x: d.orderCV,
                    y: d.leadTimeCV
                })),
                backgroundColor: 'rgba(54, 162, 235, 0.5)'
            }]
        },
        options: {
            responsive: true,
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Order Quantity CV'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Lead Time CV'
                    }
                }
            }
        }
    });
}

function groupAndAverage(data, groupKey, valueKey) {
    const groups = {};
    const counts = {};
    
    data.forEach(row => {
        if (row[groupKey] && row[valueKey] !== undefined && row[valueKey] !== null) {
            if (!groups[row[groupKey]]) {
                groups[row[groupKey]] = 0;
                counts[row[groupKey]] = 0;
            }
            groups[row[groupKey]] += row[valueKey];
            counts[row[groupKey]]++;
        }
    });

    Object.keys(groups).forEach(key => {
        groups[key] = groups[key] / counts[key];
    });

    return groups;
}

function calculateCV(array) {
    if (!array || array.length === 0) return 0;
    const mean = array.reduce((a, b) => a + b, 0) / array.length;
    const variance = array.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / array.length;
    return Math.sqrt(variance) / mean;
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
