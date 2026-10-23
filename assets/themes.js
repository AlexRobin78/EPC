// Themes.js

export const jungleTheme = {
  backgroundColor: 'black',
  surfaceCol: '#777777',
  frameCol: 'brown',                                
  barCol: 'brown', 
  trayCol: 'brown',
  checkerCols: ['white', 'black'],
  checkerBorderCols: ['black', '#cccccc'],
  pointCols: ['green', 'lime'],
  toggleButtonCol: '#aaaaaa',
  buttonCol: 'yellow',
  borderCol: '#cccccc',
  resultsBorderCol: 'orange',
  textCol: 'white',
  buttonTextCol: '#333333',
};

export const carnivalTheme = {
  backgroundColor: 'dodgerblue',
  surfaceCol: '#2a91e0',
  frameCol: 'red',
  barCol: '#cc0000',
  trayCol: '#1f6ba6',
  checkerCols: ['crimson', 'green'],
  checkerBorderCols: ['black', 'black'],
  pointCols: ['#ffc919', '#ff6f00'],
  buttonCol: 'red',
  toggleButtonCol: 'black',
  borderCol: 'black',
  resultsBorderCol: 'orange',
  textCol: 'white',
  buttonTextCol: 'white',
};

export const neonTheme = {
  backgroundColor: '#1a0b2e',
  surfaceCol: '#2b1650',
  frameCol: '#ff2e97',
  barCol: '#b5156b',
  trayCol: '#3d1f6d',
  checkerCols: ['#ffe066', '#00f5d4'],
  checkerBorderCols: ['#1a0b2e', '#1a0b2e'],
  pointCols: ['#ff2e97', '#8f4bff'],
  buttonCol: '#00f5d4',
  toggleButtonCol: '#ff2e97',
  borderCol: '#ff2e97',
  resultsBorderCol: '#8f4bff',
  textCol: '#f5f0ff',
  buttonTextCol: '#1a0b2e',
};

export const themes = ['Jungle', 'Carnival', 'Neon'];

// Build and export the stable theme map
export const themeMap = new Map();
themeMap.set('Jungle', jungleTheme);
themeMap.set('Carnival', carnivalTheme);
themeMap.set('Neon', neonTheme);