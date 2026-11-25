import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { useTheme } from '../../context/ThemeContext';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const SupplierBarChart = ({ labels, data, language = 'EN' }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Truncate long company names for neat presentation on small screens
  const formattedLabels = (labels || []).map(name => 
    name.length > 20 ? `${name.substring(0, 18)}...` : name
  );

  const chartData = {
    labels: formattedLabels.length > 0 ? formattedLabels : ['No Suppliers'],
    datasets: [
      {
        label: language === 'HI' ? 'कुल खरीद (₹)' : 'Total Purchases (₹)',
        data: data && data.length > 0 ? data : [0],
        backgroundColor: [
          isDark ? 'rgba(56, 189, 248, 0.85)' : 'rgba(12, 142, 233, 0.85)',
          'rgba(99, 102, 241, 0.85)',
          'rgba(16, 185, 129, 0.85)',
          'rgba(245, 158, 11, 0.85)',
          'rgba(168, 85, 247, 0.85)'
        ],
        borderRadius: 6,
        borderSkipped: false
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y', // Horizontal bars for clear vendor name readability
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: isDark ? '#020617' : '#0f172a',
        borderColor: isDark ? '#334155' : '#e2e8f0',
        borderWidth: 1,
        titleColor: '#ffffff',
        bodyColor: '#e2e8f0',
        padding: 10,
        cornerRadius: 8,
        callbacks: {
          title: (items) => (labels && labels[items[0].dataIndex]) || items[0].label,
          label: (ctx) => ` Total: ₹${Number(ctx.raw).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
        }
      }
    },
    scales: {
      x: {
        grid: { color: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(148, 163, 184, 0.12)' },
        ticks: {
          color: isDark ? '#94a3b8' : '#64748b',
          font: { size: 10 },
          callback: (value) => `₹${value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value}`
        }
      },
      y: {
        grid: { display: false },
        ticks: { 
          color: isDark ? '#94a3b8' : '#64748b',
          font: { size: 11 } 
        }
      }
    }
  };

  return (
    <div className="h-64 sm:h-72 w-full pt-1">
      <Bar data={chartData} options={options} />
    </div>
  );
};

export default SupplierBarChart;
