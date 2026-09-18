import { Routes, Route } from 'react-router-dom';

function PlaceholderHome() {
  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>Proto Jarvis</h1>
      <p>Placeholder route</p>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<PlaceholderHome />} />
    </Routes>
  );
}
