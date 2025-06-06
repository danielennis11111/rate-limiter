import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import ConversationHub from './components/ConversationHub';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/rate-limiter" element={<ConversationHub />} />
          <Route path="/" element={<Navigate to="/rate-limiter" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App; 