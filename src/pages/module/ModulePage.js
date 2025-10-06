// src/pages/ModulePage.js
import { useParams, useNavigate } from 'react-router-dom';

export default function ModulePage() {
  const { id } = useParams();      // get module id from URL
  const navigate = useNavigate();

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Module: {id.toUpperCase()}</h1>
      <p>This is the page for the <strong>{id}</strong> module.</p>

      <button
        style={{
          marginTop: '1rem',
          padding: '0.5rem 1rem',
          border: 'none',
          background: '#2563eb',
          color: '#fff',
          borderRadius: '6px',
          cursor: 'pointer'
        }}
        onClick={() => navigate('/dashboard')}
      >
        ⬅ Back to Dashboard
      </button>
    </div>
  );
}
