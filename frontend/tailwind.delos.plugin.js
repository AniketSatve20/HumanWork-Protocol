// tailwind.delos.plugin.js — Tailwind plugin for Delos Narrative Palette
const plugin = require('tailwindcss/plugin');
const colors = {
  obsidian: '#1A1A1B',
  bone: '#F5F5F5',
  'delos-grey': '#83858D',
  'host-orange': '#FA831B',
  'narrative-crimson': '#8B0000',
  'sublime-teal': '#007A7A',
};

module.exports = plugin(function({ addUtilities, e }) {
  const newUtilities = {};
  Object.entries(colors).forEach(([name, value]) => {
    newUtilities[`.bg-${e(name)}`] = { backgroundColor: value };
    newUtilities[`.text-${e(name)}`] = { color: value };
    newUtilities[`.border-${e(name)}`] = { borderColor: value };
  });
  addUtilities(newUtilities, ['responsive', 'hover']);
});
