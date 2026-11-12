import { Chart as ChartJS, ArcElement, BarElement, CategoryScale, Filler, Legend, LineElement, LinearScale, PointElement, Tooltip } from 'chart.js';
import { useTheme } from './context';

ChartJS.register(ArcElement, BarElement, CategoryScale, Filler, Legend, LineElement, LinearScale, PointElement, Tooltip);

export const PALETTE = ['#7c5cff', '#4f6bff', '#22a6ff', '#b794ff', '#5eead4', '#f472b6'];

// Chart.js draws on <canvas>, so it needs real colours rather than CSS variables.
export function useChartOptions({ legend = false, max, percent = false } = {}) {
  const { theme } = useTheme();
  const text = theme === 'dark' ? '#a9aad6' : '#5e5e8c';
  const grid = theme === 'dark' ? 'rgba(255,255,255,.07)' : 'rgba(60,50,140,.09)';
  ChartJS.defaults.font.family = 'Figtree, system-ui, sans-serif';
  return {
    key: theme,
    options: {
      responsive: true, maintainAspectRatio: false,
      animation: { duration: 900, easing: 'easeOutQuart' },
      plugins: {
        legend: { display: legend, position: 'bottom', labels: { color: text, usePointStyle: true, boxWidth: 8 } },
        tooltip: { backgroundColor: theme === 'dark' ? '#1d1b3d' : '#ffffff', titleColor: theme === 'dark' ? '#fff' : '#1a1840', bodyColor: theme === 'dark' ? '#cfcff5' : '#3b3a66', borderColor: grid, borderWidth: 1, padding: 10, cornerRadius: 10 },
      },
      scales: {
        x: { ticks: { color: text }, grid: { display: false }, border: { display: false } },
        y: { beginAtZero: true, max, ticks: { color: text, callback: percent ? (v) => `${v}%` : undefined }, grid: { color: grid }, border: { display: false } },
      },
    },
    text, grid,
  };
}
export const doughnutOptions = (text) => ({
  responsive: true, maintainAspectRatio: false, cutout: '72%',
  animation: { animateRotate: true, duration: 1000 },
  plugins: { legend: { position: 'bottom', labels: { color: text, usePointStyle: true, boxWidth: 8 } } },
});
