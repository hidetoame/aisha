import React from 'react';

const App: React.FC = () => {
  return (
    <div style={{ padding: '20px', fontSize: '24px', color: 'white', backgroundColor: '#111' }}>
      <h1>🚗 AISHA Test</h1>
      <p>アプリケーションが正常に動作しています！</p>
      <p>現在時刻: {new Date().toLocaleString()}</p>
    </div>
  );
};

export default App;
