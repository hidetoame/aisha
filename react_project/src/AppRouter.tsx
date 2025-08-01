import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import App from './App';
import PublicShareView from './views/PublicShareView';

const AppRouter: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/share/:frontendId" element={<PublicShareView />} />
        <Route path="/*" element={<App />} />
      </Routes>
    </Router>
  );
};

export default AppRouter;