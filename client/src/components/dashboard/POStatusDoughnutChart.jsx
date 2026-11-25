import React from 'react';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend
} from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import { useTheme } from '../../context/ThemeContext';

ChartJS.register(ArcElement, Tooltip, Legend);

const POStatusDoughnutChart = ({ labels, data, language = 'EN' }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const hasData = data && data.some(val => val > 0);

  const chartData = {
    labels: labels || ['Draft', 'Issued', 'Partially Delivered', 'Completed', 'Cancelled'],
    datasets: [
      {
        data: hasData ? data : [1],
        backgroundColor: hasData
          ? [
              '#94a3b8', // Draft (slate)
              '#3b82f6', // Issued (blue)
              '#6366f1', // Partially Delivered (indigo)
              '#10b981', // Completed (emerald)
              '#f43f5e'  // Cancelled (rose)
            ]
          : ['#cbd5e1'],
        borderWidth: 2,
        borderColor: isDark ? '#0f172a' : '#ffffff'
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '70%',
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          boxWidth: 10,
          color: isDark ? '#cbd5e1' : '#475569',
          font: { size: 11 },
          padding: 12
        }
      },
      tooltip: {
        backgroundColor: isDark ? '#020617' : '#0f172a',
        borderColor: isDark ? '#334155' : '#e2e8f0',
        borderWidth: 1,
        titleColor: '#ffffff',
        bodyColor: '#e2e8f0',
        padding: 8,
        cornerRadius: 6,
        enabled: hasData,
        callbacks: {
          label: (ctx) => ` ${ctx.label}: ${ctx.raw} orders`
        }
      }
    }
  };

  return (
    <div className="h-64 sm:h-72 w-full flex items-center justify-center pt-1">
      <Doughnut data={chartData} options={options} />
    </div>
  );
};

export default POStatusDoughnutChart;
