import React from 'react';

const LoadingDots: React.FC = () => {
  return (
    <span className="loading-dots">
      <span className="dot">.</span>
      <span className="dot">.</span>
      <span className="dot">.</span>
    </span>
  );
};

export default LoadingDots;