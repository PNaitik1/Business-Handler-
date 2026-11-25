import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { useTheme } from '../../context/ThemeContext';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const ExpenseLineChart = ({ labels, data, language = 'EN' }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const chartData = {
    labels: labels && labels.length > 0 ? labels : ['No Data'],
    datasets: [
      {
        fill: true,
        label: language === 'HI' ? 'खरीद खर्च (₹)' : 'Procurement Spend (₹)',
        data: data && data.length > 0 ? data : [0],
        borderColor: isDark ? '#38bdf8' : '#0c8ee9',
        backgroundColor: isDark ? 'rgba(56, 189, 248, 0.15)' : 'rgba(12, 142, 233, 0.08)',
        borderWidth: 2.5,
        tension: 0.35,
        pointBackgroundColor: isDark ? '#38bdf8' : '#0c8ee9',
        pointBorderColor: isDark ? '#0f172a' : '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 4.5,
        pointHoverRadius: 6,
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: isDark ? '#020617' : '#0f172a',
        borderColor: isDark ? '#334155' : '#e2e8f0',
        borderWidth: 1,
        titleColor: '#ffffff',
        bodyColor: '#e2e8f0',
        titleFont: { size: 12, weight: '600' },
        bodyFont: { size: 12 },
        padding: 10,
        cornerRadius: 8,
        callbacks: {
          label: (ctx) => ` ₹${Number(ctx.raw).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
        }
      }
    },
    scales: {
      y: {
        grid: { color: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(148, 163, 184, 0.12)' },
        ticks: {
          color: isDark ? '#94a3b8' : '#64748b',
          font: { size: 11 },
          callback: (value) => `₹${value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value}`
        }
      },
      x: {
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
      <Line data={chartData} options={options} />
    </div>
  );
};

export default ExpenseLineChart;
